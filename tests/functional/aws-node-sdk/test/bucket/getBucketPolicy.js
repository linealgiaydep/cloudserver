const assert = require('assert');
const { errors } = require('arsenal');
const { S3 } = require('aws-sdk');

const getConfig = require('../support/config');
const BucketUtility = require('../../lib/utility/bucket-util');

const bucket = 'getbucketpolicy-testbucket';
const bucketPolicy = {
    Version: '2012-10-17',
    Statement: [{
        Sid: 'testid',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:putBucketPolicy',
        Resource: `arn:aws:s3:::${bucket}`,
    }],
};
const expectedPolicy = {
    Sid: 'testid',
    Effect: 'Allow',
    Principal: '*',
    Action: 's3:putBucketPolicy',
    Resource: `arn:aws:s3:::${bucket}`,
};

// Check for the expected error response code and status code.
function assertError(err, expectedErr, cb) {
    if (expectedErr === null) {
        assert.strictEqual(err, null, `expected no error but got '${err}'`);
    } else {
        assert.strictEqual(err.code, expectedErr, 'incorrect error response ' +
            `code: should be '${expectedErr}' but got '${err.code}'`);
        assert.strictEqual(err.statusCode, errors[expectedErr].code,
            'incorrect error status code: should be 400 but got ' +
            `'${err.statusCode}'`);
    }
    cb();
}

describe('aws-sdk test get bucket policy', () => {
    const config = getConfig('default', { signatureVersion: 'v4' });
    const s3 = new S3(config);
    const otherAccountS3 = new BucketUtility('lisa', {}).s3;

    it('should return NoSuchBucket error if bucket does not exist', done => {
        s3.getBucketPolicy({ Bucket: bucket }, err =>
            assertError(err, 'NoSuchBucket', done));
    });

    describe('policy rules', () => {
        beforeEach(done => s3.createBucket({ Bucket: bucket }, done));

        afterEach(done => s3.deleteBucket({ Bucket: bucket }, done));

        it('should return MethodNotAllowed if user is not bucket owner', done => {
            otherAccountS3.getBucketPolicy({ Bucket: bucket },
            err => assertError(err, 'MethodNotAllowed', done));
        });

        it('should return NoSuchBucketPolicy error if no policy put to bucket',
        done => {
            s3.getBucketPolicy({ Bucket: bucket }, err => {
                assertError(err, 'NoSuchBucketPolicy', done);
            });
        });

        it('should get bucket policy', done => {
            s3.putBucketPolicy({
                Bucket: bucket,
                Policy: JSON.stringify(bucketPolicy),
            }, err => {
                assert.equal(err, null, `Err putting bucket policy: ${err}`);
                s3.getBucketPolicy({ Bucket: bucket },
                (err, res) => {
                    const parsedRes = JSON.parse(res.Policy);
                    assert.equal(err, null, 'Error getting bucket policy: ' +
                        `${err}`);
                    assert.deepStrictEqual(parsedRes.Statement[0], expectedPolicy);
                    done();
                });
            });
        });
    });
});
