import { S3Client, PutObjectCommand, HeadObjectCommand,  } from "@aws-sdk/client-s3";
import crypto from 'crypto'
import { Provider } from '../../../uploads/provider'

interface S3ProviderOptions {
  // credentials: Record<string, unknown>;
  bucketName: string;
  bucketRegion: string;
}

export default class S3Provider implements Provider {
  private bucketName: string
  private client: S3Client;

  constructor (_options: Partial<S3ProviderOptions>) {
    // TODO: grab from S3 vars instead
    const options: Required<S3ProviderOptions> = {
      // credentials: _options.credentials || JSON.parse(process.env.RCTF_S3_CREDENTIALS as string),
      bucketName: _options.bucketName || process.env.RCTF_S3_BUCKET as string,
      // TODO: actually grab var
      bucketRegion: "us-west-2",
    }
    // TODO: validate that all options are indeed provided

    // this.bucket = new Bucket(storage, options.bucketName)
    this.client = new S3Client({
      region: options.bucketRegion,
    });
    this.bucketName = options.bucketName
  }

  // 
  // private getS3File = (sha256: string, name: string): File => {
  //   const key = `uploads/${sha256}/${name}`
  //   const file = this.bucketName.file(key)
  //   return file
  // }

  // Validate file exists
  private async checkS3Object (sha256: string, name: string): Promise<boolean> {
    const command = new HeadObjectCommand ({
      Bucket: this.bucketName,
      Key: `uploads/${sha256}/${name}`,
    });

    try {
      // const data: HeadObjectCommandInput = await this.client.send(command);
      await this.client.send(command);
    } catch (error) {
      return false;
      // TODO: eror handle?
    }
    
    return true;
  }

  upload = async (data: Buffer, name: string): Promise<string> => {
    const hash = crypto.createHash('sha256').update(data).digest('hex')

    const file = this.checkS3Object(hash, name);

    const exists = (await file)
    if (!exists) {
      const command = new  PutObjectCommand({
        Bucket: this.bucketName,
        Key: hash,
        Body: data,
      });
      await this.client.send(command)
    }
    return this.toUrl(hash, name)
  }

  // TODO: finish replaceing this
  private toUrl (sha256: string, name: string): string {
    return `https://${this.bucketName}.storage.googleapis.com/uploads/${sha256}/${encodeURIComponent(name)}`
  }

  async getUrl (sha256: string, name: string): Promise<string|null> {
    const file = this.checkS3Object(sha256, name);

    const exists = (await file)
    if (!exists) return null

    return this.toUrl(sha256, name)
  }
}
