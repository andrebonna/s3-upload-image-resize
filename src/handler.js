import AWS from 'aws-sdk';
import sharp from 'sharp';
import logger from 'winston';
import iptc from 'node-iptc';

logger.level = process.env.LOG_LEVEL || 'info';

const s3 = new AWS.S3({ region: 'us-east-1' });

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
                const result = iptc(data.Body);
                logger.info('IPTC Data', JSON.parse(Buffer.from(JSON.stringify(result), 'ASCII').toString('utf-8')));
                return sharp(data.Body).resize(640).toFormat('png').toBuffer();
            })
            .then(data => s3.putObject({
                Bucket: process.env.TARGET_BUCKET_NAME,
                Key: key + '-640.png',
                ContentType: 'image/png',
                Body: data
            }).promise())
            .then((data) => logger.info('Successfully Saved Image', data))
            .catch(err => logger.error(err, err.stack));
    });
}
