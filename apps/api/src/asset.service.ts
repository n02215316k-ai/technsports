import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

@Injectable()
export class AssetService {
  saveImage(file:any,folder:'covers'|'team-logos'){
    if(!file?.buffer)throw new BadRequestException('Image file is required');
    if(file.size>5*1024*1024)throw new BadRequestException('Image must not exceed 5 MB');
    const extension=this.extension(file.buffer);
    if(!extension)throw new BadRequestException('File content must be a valid JPG, PNG or WebP image');
    const directory=join(process.cwd(),'uploads',folder);mkdirSync(directory,{recursive:true});
    const filename=`${randomUUID()}.${extension}`;writeFileSync(join(directory,filename),file.buffer,{flag:'wx'});
    return {path:`/uploads/${folder}/${filename}`,filename,mimeType:extension==='jpg'?'image/jpeg':`image/${extension}`,size:file.size};
  }
  private extension(buffer:Buffer){if(buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))return'png';if(buffer.length>=3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff)return'jpg';if(buffer.length>=12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return'webp';return null}
}
