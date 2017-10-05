# S3 Upload Image Thumbnails
Create automatic thumbnails after uploading images to S3

### Requirements

- [NodeJS 6+ installed](https://nodejs.org/en/download/)
- [AWS account with API credentials](https://serverless.com/framework/docs/providers/aws/guide/credentials/)
- [Serverless CLI installed](https://serverless.com/framework/docs/providers/aws/guide/installation#installing-the-serverless-framework)


## Environment Variables
```
SOURCE_BUCKET_NAME: # Define AWS Source S3 bucket name
TARGET_BUCKET_NAME: # Define AWS Target S3 bucket name
```

## Deploy
```
SOURCE_BUCKET_NAME=<path-to-your-source-s3-bucket> TARGET_BUCKET_NAME=<path-to-your-target-s3-bucket> npm run deploy
```







