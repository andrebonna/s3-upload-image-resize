import AWS from 'aws-sdk';
import sharp from 'sharp';
import logger from 'winston';
import iptc from 'node-iptc';

logger.level = process.env.LOG_LEVEL || 'info';

//List of widths to resize image - Could be an external parameter
const WIDTHS = [1024, 640, 320];

const s3 = new AWS.S3({ region: 'us-east-1' });
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

function convertASCIItoUTF8(value) {
    return JSON.parse(Buffer.from(JSON.stringify(value), 'ASCII').toString('utf-8'));
}

function getImageKey(width, key) {
    return `${key}-${width}.png`;
}

function getTargetURLs(widths, key) {
    return widths
        .map((width) => `https://s3.amazonaws.com/${process.env.TARGET_BUCKET_NAME}/${getImageKey(width, key)}`);
}

function getObjectByKey(key) {
    return s3.getObject({
        Bucket: process.env.SOURCE_BUCKET_NAME,
        Key: key
    }).promise().then((data) => {
        // Enrich data with iptc metadata
        const iptcMetadata = convertASCIItoUTF8(iptc(data.Body));
        logger.debug('IPTC Data', iptcMetadata);
        return {
            ...data,
            iptcMetadata
        };
    });
}

function resizeAndPutS3Object(width, key) {
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

function removeS3Object(width, key) {
    return () => s3.deleteObject({
        Bucket: process.env.TARGET_BUCKET_NAME,
        Key: getImageKey(width, key)
    }).promise();
}

function saveMetadata(data, key) {
    const { headline, caption, special_instructions } = data.iptcMetadata;
    const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
            Name: key,
            Title: headline,
            Description: caption,
            URLs: getTargetURLs(WIDTHS, key),
            Categories: special_instructions && special_instructions.split(',')
        }
    };
    return dynamodb.put(params).promise();
}

function deleteMetadata(key) {
    const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
            Name: key
        }
    };
    return dynamodb.delete(params).promise();
}

export function create(event) {
    event.Records.forEach((record) => {
        const {
            object: {
                key
            }
        } = record.s3;

        let promise = getObjectByKey(key);

        for (const width of WIDTHS) {
            promise = promise.then(resizeAndPutS3Object(width, key));
        }

        promise
            .then(() => logger.info('Image Saved to target bucket', key))
            .then((data) => saveMetadata(data, key))
            .then(() => logger.info('Image Metadata Saved to Table', process.env.DYNAMODB_TABLE))
            .catch(err => logger.error(err, err.stack));
    });
}

export function remove(event) {
    event.Records.forEach((record) => {
        const {
            object: {
                key
            }
        } = record.s3;

        let promise = Promise.resolve();

        for (const width of WIDTHS) {
            promise = promise.then(removeS3Object(width, key));
        }

        promise
            .then(() => logger.info('Image Remove from target bucket', key))
            .then(() => deleteMetadata(key))
            .then(() => logger.info('Image Metadata Removed from Table', process.env.DYNAMODB_TABLE))
            .catch(err => logger.error(err, err.stack));
    });
}
