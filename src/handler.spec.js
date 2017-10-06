import fs from 'fs';
import AWS from 'aws-sdk';

function generatePromiseFn(content) {
    return jest.fn(() => ({ promise: () => Promise.resolve(content) }));
}

describe('S3 Upload', () => {

    const body = fs.readFileSync(`${__dirname}/mockImage.jpg`);
    let getObjectSpy = generatePromiseFn({ Body: body });
    let putObjectSpy = generatePromiseFn();
    let deleteObjectSpy = generatePromiseFn();
    let putSpy = generatePromiseFn();
    let deleteSpy = generatePromiseFn();
    AWS.S3 = class {
        constructor() {
            this.getObject = getObjectSpy;
            this.putObject = putObjectSpy;
            this.deleteObject = deleteObjectSpy;
        }
    };
    AWS.DynamoDB.DocumentClient = class {
        constructor() {
            this.put = putSpy;
            this.delete = deleteSpy;
        }
    };
    const { create, remove } = require('./handler');

    beforeEach(() => {
        getObjectSpy.mockClear();
        putObjectSpy.mockClear();
        deleteObjectSpy.mockClear();
        putSpy.mockClear();
        deleteSpy.mockClear();
    });

    it('create handler successfully', (done) => {
        create({
            Records: [{
                s3: {
                    object: {
                        key: 'keyMocked'
                    }
                }
            }]
        }).then(() => {
            expect(getObjectSpy.mock.calls).toMatchSnapshot();
            expect(putObjectSpy.mock.calls.length).toBe(3);
            expect(putSpy.mock.calls).toMatchSnapshot();
            done();
        }).catch(done.fail);
    });

    it('create handler with S3 getObject error', (done) => {

        getObjectSpy.mockImplementationOnce(() => ({
            promise: () => Promise.reject('simulate getObject error')
        }));
        create({
            Records: [{
                s3: {
                    object: {
                        key: 'keyMocked'
                    }
                }
            }]
        }).then(() => {
            expect(getObjectSpy.mock.calls).toMatchSnapshot();
            expect(putObjectSpy.mock.calls.length).toBe(0);
            expect(putSpy.mock.calls).toMatchSnapshot();
            done();
        }).catch(done.fail);
    });

    it('create handler with S3 putObject error', (done) => {

        putObjectSpy.mockImplementationOnce(() => ({
            promise: () => Promise.reject('simulate putObject error')
        }));
        create({
            Records: [{
                s3: {
                    object: {
                        key: 'keyMocked'
                    }
                }
            }]
        }).then(() => {
            expect(getObjectSpy.mock.calls).toMatchSnapshot();
            expect(putObjectSpy.mock.calls.length).toBe(1);
            expect(putSpy.mock.calls).toMatchSnapshot();
            done();
        }).catch(done.fail);
    });

    it('create handler with DynamoDB put error', (done) => {

        putSpy.mockImplementationOnce(() => ({
            promise: () => Promise.reject('simulate DynamoDB put error')
        }));
        create({
            Records: [{
                s3: {
                    object: {
                        key: 'keyMocked'
                    }
                }
            }]
        }).then(() => {
            expect(getObjectSpy.mock.calls).toMatchSnapshot();
            expect(putObjectSpy.mock.calls.length).toBe(3);
            expect(putSpy.mock.calls).toMatchSnapshot();
            done();
        }).catch(done.fail);
    });

    it('remove handler successfully', (done) => {
        remove({
            Records: [{
                s3: {
                    object: {
                        key: 'keyMocked'
                    }
                }
            }]
        }).then(() => {
            expect(deleteObjectSpy.mock.calls).toMatchSnapshot();
            expect(deleteSpy.mock.calls).toMatchSnapshot();
            done();
        }).catch(done.fail);
    });

    it('remove handler with S3 deleteObject error', (done) => {
        deleteObjectSpy.mockImplementationOnce(() => ({
            promise: () => Promise.reject('simulate deleteObject error')
        }));
        remove({
            Records: [{
                s3: {
                    object: {
                        key: 'keyMocked'
                    }
                }
            }]
        }).then(() => {
            expect(deleteObjectSpy.mock.calls).toMatchSnapshot();
            expect(deleteSpy.mock.calls).toMatchSnapshot();
            done();
        }).catch(done.fail);
    });

    it('remove handler with DynamoDB delete error', (done) => {
        deleteSpy.mockImplementationOnce(() => ({
            promise: () => Promise.reject('simulate DynamoDB delete error')
        }));
        remove({
            Records: [{
                s3: {
                    object: {
                        key: 'keyMocked'
                    }
                }
            }]
        }).then(() => {
            expect(deleteObjectSpy.mock.calls).toMatchSnapshot();
            expect(deleteSpy.mock.calls).toMatchSnapshot();
            done();
        }).catch(done.fail);
    });
});