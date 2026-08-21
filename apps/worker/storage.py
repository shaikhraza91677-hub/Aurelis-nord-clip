import os
from pathlib import Path
from typing import Optional

def upload_media(path: str) -> Optional[str]:
    bucket=os.getenv('S3_BUCKET')
    endpoint=os.getenv('S3_ENDPOINT')
    region=os.getenv('S3_REGION','us-east-1')
    if not bucket:return None
    try:
        import boto3
        from botocore.client import Config
        client=boto3.client('s3',region_name=region,endpoint_url=endpoint or None,aws_access_key_id=os.getenv('S3_ACCESS_KEY_ID'),aws_secret_access_key=os.getenv('S3_SECRET_ACCESS_KEY'),config=Config(signature_version='s3v4'))
        key=f"aurelis/{Path(path).name}"
        client.upload_file(path,bucket,key,ExtraArgs={'ContentType':'video/mp4','CacheControl':'public,max-age=31536000'})
        return client.generate_presigned_url('get_object',Params={'Bucket':bucket,'Key':key},ExpiresIn=3600)
    except Exception as exc:
        print(f'[storage] upload skipped: {exc}')
        return None
