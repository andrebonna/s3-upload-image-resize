import AWS from 'aws-sdk';
import sharp from 'sharp';
import logger from 'winston';

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
            .then((data) => sharp(data.Body).resize(640).toBuffer())
            .then(data => s3.putObject({
                Bucket: process.env.TARGET_BUCKET_NAME,
                Key: key + '-640.jpg',
                Body: data
            }))
            .then((data) => logger.info('Successfully Saved Image', data))
            .catch(err => logger.error(err, err.stack));
    });
}
