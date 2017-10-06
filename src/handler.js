import AWS from 'aws-sdk';
import sharp from 'sharp';
import logger from 'winston';
import iptc from 'node-iptc';

logger.level = process.env.LOG_LEVEL || 'debug';

const s3 = new AWS.S3({ region: 'us-east-1' });
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

function convertASCIItoUTF8(value) {
    return JSON.parse(Buffer.from(JSON.stringify(value), 'ASCII').toString('utf-8'));
}

function getImageKey(width, key) {
    return `${key}-${width}.png`;
}

function getTargetURLs(widths, key) {
    return widths.map((width)=> `https://s3.amazonaws.com/${process.env.TARGET_BUCKET_NAME}/${getImageKey(width, key)}`);
}

function resizeAndSave(width, key) {
    return data => {
        return sharp(data.Body).resize(width).toFormat('png').toBuffer()
            .then(fileBuffer => s3.putObject({
                Bucket: process.env.TARGET_BUCKET_NAME,
                Key: getImageKey(width, key),
                ACL: 'public-read',
                ContentType: 'image/png',
                Body: fileBuffer
            }).promise())
            .then(() => data);
    };
}

export function postprocess(event) {
    event.Records.forEach((record) => {
        const {
            object: {
                key
            }
        } = record.s3;

        s3.getObject({
            Bucket: process.env.SOURCE_BUCKET_NAME,
            Key: key
        }).promise()

            .then((data) => {
                const iptcMetadata = convertASCIItoUTF8(iptc(data.Body));
                logger.debug('IPTC Data', iptcMetadata);
                return {
                    ...data,
                    iptcMetadata
                };
            })
            .then(resizeAndSave(1024, key))
            .then(resizeAndSave(640, key))
            .then(resizeAndSave(320, key))
            .then((data) => {
                logger.debug('Image Saved to target bucket', key);
                const { headline, caption, special_instructions } = data.iptcMetadata;
                const params = {
                    TableName: process.env.DYNAMODB_TABLE,
                    Item: {
                        Name: headline,
                        Description: caption,
                        URLs: getTargetURLs([1024, 640, 320], key),
                        Categories: special_instructions && special_instructions.split(',')
                    }
                };
                return dynamodb.put(params).promise();
            })
            
            .then(() => logger.debug('Image Metadata Saved to Table', process.env.DYNAMODB_TABLE))
            .catch(err => logger.error(err, err.stack));
    });
}
