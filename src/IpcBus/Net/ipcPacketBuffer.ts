import { Buffer } from 'buffer';
import * as headerHelpers from './ipcPacketBufferHeader';


class BufferReader {
    offset: number;
    buffer: Buffer;

    constructor(buffer: Buffer, offset?: number) {
        this.buffer = buffer;
        this.offset = +offset || 0;
    }
}

export class IpcPacketBuffer { // extends headerHelpers.IpcPacketBufferHeader {
    static writeFooter(buffer: Buffer, offset: number): number {
        buffer[offset++] = headerHelpers.footerSeparator;
        return offset;
    }

    // Thanks to https://github.com/tests-always-included/buffer-serializer/
    static fromNumber(dataNumber: number): Buffer {
        let offset = 0;
        // An integer
        if (Math.floor(dataNumber) === dataNumber) {
            let absDataNumber = Math.abs(dataNumber);
            // 32-bit integer
            if (absDataNumber <= 0xFFFFFFFF) {
                let buffer = new Buffer(headerHelpers.IntegerPacketSize);
                // Negative integer
                if (dataNumber < 0) {
                    offset = headerHelpers.IpcPacketBufferHeader.writeHeader(headerHelpers.BufferType.NegativeInteger, buffer, 0);
                }
                // Positive integer
                else {
                    offset = headerHelpers.IpcPacketBufferHeader.writeHeader(headerHelpers.BufferType.PositiveInteger, buffer, 0);
                }
                offset = buffer.writeUInt32LE(absDataNumber, offset);
                IpcPacketBuffer.writeFooter(buffer, offset);
                return buffer;
            }
        }
        // Either this is not an integer or it is outside of a 32-bit integer.
        // Store as a double.
        let buffer = new Buffer(headerHelpers.DoublePacketSize);
        offset = headerHelpers.IpcPacketBufferHeader.writeHeader(headerHelpers.BufferType.Double, buffer, 0);
        offset = buffer.writeDoubleLE(dataNumber, offset);
        IpcPacketBuffer.writeFooter(buffer, offset);
        return buffer;
    }

    static fromBoolean(dataBoolean: boolean): Buffer {
        let buffer = new Buffer(headerHelpers.BooleanPacketSize);
        let offset = headerHelpers.IpcPacketBufferHeader.writeHeader(headerHelpers.BufferType.Boolean, buffer, 0);
        buffer[offset++] = dataBoolean ? 0xFF : 0x00;
        IpcPacketBuffer.writeFooter(buffer, offset);
        return buffer;
    }

    static fromString(data: string, encoding?: string): Buffer {
        let len = headerHelpers.StringHeaderLength + data.length + headerHelpers.FooterLength;
        let buffer = new Buffer(len);
        let offset = headerHelpers.IpcPacketBufferHeader.writeHeader(headerHelpers.BufferType.String, buffer, 0);
        offset = buffer.writeUInt32LE(len, offset);
        offset += buffer.write(data, offset, data.length, encoding);
        IpcPacketBuffer.writeFooter(buffer, offset);
        return buffer;
    }

    static fromObject(dataObject: Object): Buffer {
        let data = JSON.stringify(dataObject);
        let len = headerHelpers.ObjectHeaderLength + data.length + headerHelpers.FooterLength;
        let buffer = new Buffer(len);
        let offset = headerHelpers.IpcPacketBufferHeader.writeHeader(headerHelpers.BufferType.Object, buffer, 0);
        offset = buffer.writeUInt32LE(len, offset);
        offset += buffer.write(data, offset, data.length, 'utf8');
        IpcPacketBuffer.writeFooter(buffer, offset);
        return buffer;
    }

    static fromBuffer(data: Buffer): Buffer {
        let len = headerHelpers.BufferHeaderLength + data.length + headerHelpers.FooterLength;
        let buffer = new Buffer(len);
        let offset = headerHelpers.IpcPacketBufferHeader.writeHeader(headerHelpers.BufferType.Buffer, buffer, 0);
        offset = buffer.writeUInt32LE(len, offset);
        offset += data.copy(buffer, offset);
        IpcPacketBuffer.writeFooter(buffer, offset);
        return buffer;
    }

    static fromArray(args: any[]): Buffer {
        let buffers: Buffer[] = [];
        let buffersLength = 0;
        args.forEach((arg) => {
            let buffer = IpcPacketBuffer.from(arg);
            buffersLength += buffer.length;
            buffers.push(buffer);
        });
        let lenHeader = headerHelpers.ArrayHeaderLength;
        let lenFooter = headerHelpers.FooterLength;

        let len = lenHeader + buffersLength + lenFooter;

        let bufferHeader = new Buffer(lenHeader);
        let offsetHeader = headerHelpers.IpcPacketBufferHeader.writeHeader(headerHelpers.BufferType.Array, bufferHeader, 0);
        offsetHeader = bufferHeader.writeUInt32LE(len, offsetHeader);

        let bufferFooter = new Buffer(lenFooter);
        IpcPacketBuffer.writeFooter(bufferFooter, 0);

        buffers.unshift(bufferHeader);
        buffers.push(bufferFooter);

        return Buffer.concat(buffers, len);
    }

    static from(data: any): Buffer {
        let buffer: Buffer;
        if (Array.isArray(data)) {
            buffer = IpcPacketBuffer.fromArray(data);
        }
        else if (Buffer.isBuffer(data)) {
            buffer = IpcPacketBuffer.fromBuffer(data);
        }
        else {
            switch (typeof data) {
                case 'object':
                    buffer = IpcPacketBuffer.fromObject(data);
                    break;
                case 'string':
                    buffer = IpcPacketBuffer.fromString(data);
                    break;
                case 'number':
                    buffer = IpcPacketBuffer.fromNumber(data);
                    break;
                case 'boolean':
                    buffer = IpcPacketBuffer.fromBoolean(data);
                    break;
            }
        }
        return buffer;
    }

    static to(buffer: Buffer, offset?: number): any {
        let header = new headerHelpers.IpcPacketBufferHeader(buffer, offset);
        return IpcPacketBuffer._to(header, new BufferReader(buffer, offset));
    }

    private static _to(header: headerHelpers.IpcPacketBufferHeader, bufferReader: BufferReader): any {
        let arg: any;
        switch (header.type) {
            case headerHelpers.BufferType.Array: {
                arg = IpcPacketBuffer._toArray(header, bufferReader);
                break;
            }
            case headerHelpers.BufferType.Object: {
                arg = IpcPacketBuffer._toObject(header, bufferReader);
                break;
            }
            case headerHelpers.BufferType.String: {
                arg = IpcPacketBuffer._toString(header, bufferReader);
                break;
            }
            case headerHelpers.BufferType.Buffer: {
                arg = IpcPacketBuffer._toBuffer(header, bufferReader);
                break;
            }
            case headerHelpers.BufferType.PositiveInteger:
            case headerHelpers.BufferType.NegativeInteger:
            case headerHelpers.BufferType.Double: {
                arg = IpcPacketBuffer._toNumber(header, bufferReader);
                break;
            }
            case headerHelpers.BufferType.Boolean: {
                arg = IpcPacketBuffer._toBoolean(header, bufferReader);
                break;
            }
        }
        return arg;
    }

    static toBoolean(buffer: Buffer, offset?: number): boolean {
        let header = new headerHelpers.IpcPacketBufferHeader(buffer, offset);
        if (header.isBoolean() === false) {
            return null;
        }
        return IpcPacketBuffer._toBoolean(header, new BufferReader(buffer, offset));
    }

    private static _toBoolean(header: headerHelpers.IpcPacketBufferHeader, bufferReader: BufferReader): boolean {
        let offsetContent = bufferReader.offset + header.headerSize;
        bufferReader.offset += header.packetSize;
        return (bufferReader.buffer[offsetContent] === 0xFF);
    }

    static toNumber(buffer: Buffer, offset?: number): number {
        let header = new headerHelpers.IpcPacketBufferHeader(buffer, offset);
        if (header.isNumber() === false) {
            return null;
        }
        return IpcPacketBuffer._toNumber(header, new BufferReader(buffer, offset));
    }

    private static _toNumber(header: headerHelpers.IpcPacketBufferHeader, bufferReader: BufferReader): number {
        let offsetContent = bufferReader.offset + header.headerSize;
        bufferReader.offset += header.packetSize;

        switch (header.type) {
            case headerHelpers.BufferType.Double:
                return bufferReader.buffer.readDoubleBE(offsetContent);
            case headerHelpers.BufferType.NegativeInteger:
                return -bufferReader.buffer.readUInt32BE(offsetContent);
            case headerHelpers.BufferType.PositiveInteger:
                return +bufferReader.buffer.readUInt32BE(offsetContent);
            default :
                return 0;
        }
    }

    static toObject(buffer: Buffer, offset?: number): any {
        let header = new headerHelpers.IpcPacketBufferHeader(buffer, offset);
        if (header.isObject() === false) {
            return null;
        }
        return IpcPacketBuffer._toObject(header, new BufferReader(buffer, offset));
    }

    private static _toObject(header: headerHelpers.IpcPacketBufferHeader, bufferReader: BufferReader): any {
        let offsetContent = bufferReader.offset + header.headerSize;
        bufferReader.offset += header.packetSize;
        return JSON.parse(bufferReader.buffer.toString('utf8', offsetContent, offsetContent + header.contentSize));
    }

    static toString(buffer: Buffer, offset?: number, encoding?: string): string {
        let header = new headerHelpers.IpcPacketBufferHeader(buffer, offset);
        if (header.isString() === false) {
            return null;
        }
        return IpcPacketBuffer._toString(header, new BufferReader(buffer, offset), encoding);
    }

    private static _toString(header: headerHelpers.IpcPacketBufferHeader, bufferReader: BufferReader, encoding?: string): string {
        let offsetContent = bufferReader.offset + header.headerSize;
        bufferReader.offset += header.packetSize;
        return bufferReader.buffer.toString(encoding, offsetContent, offsetContent + header.contentSize);
    }

    static toBuffer(buffer: Buffer, offset?: number): Buffer {
        let header = new headerHelpers.IpcPacketBufferHeader(buffer, offset);
        if (header.isBuffer() === false) {
            return null;
        }
        return IpcPacketBuffer._toBuffer(header, new BufferReader(buffer, offset));
    }

    private static _toBuffer(header: headerHelpers.IpcPacketBufferHeader, bufferReader: BufferReader): Buffer {
        let offsetContent = bufferReader.offset + header.headerSize;
        bufferReader.offset += header.packetSize;
        return bufferReader.buffer.slice(offsetContent, offsetContent + header.contentSize);
    }

    static toArrayAt(index: number, buffer: Buffer, offset?: number): any {
        let header = new headerHelpers.IpcPacketBufferHeader(buffer, offset);
        if (header.isArray() === false) {
            return null;
        }
        return IpcPacketBuffer._toArrayAt(header, index, new BufferReader(buffer, offset));
    }

    private static _toArrayAt(header: headerHelpers.IpcPacketBufferHeader, index: number, bufferReader: BufferReader): any {
        bufferReader.offset += header.headerSize;
        let offsetContentSize = bufferReader.offset + header.contentSize;
        let headerArg = new headerHelpers.IpcPacketBufferHeader();
        while ((index > 0) && (bufferReader.offset < offsetContentSize)) {
            headerArg.readHeader(bufferReader.buffer, bufferReader.offset);
            bufferReader.offset += headerArg.packetSize;
            --index;
        }
        let arg: any;
        if (index === 0) {
            headerArg.readHeader(bufferReader.buffer, bufferReader.offset);
            arg = IpcPacketBuffer._to(headerArg, bufferReader);
        }
        return arg;
    }

    static toArray(buffer: Buffer, offset?: number): any[] {
        let header = new headerHelpers.IpcPacketBufferHeader(buffer, offset);
        if (header.isArray() === false) {
            return null;
        }
        return IpcPacketBuffer._toArray(header, new BufferReader(buffer, offset));
    }

    private static _toArray(header: headerHelpers.IpcPacketBufferHeader, bufferReader: BufferReader): any[] {
        bufferReader.offset += header.headerSize;
        let offsetContentSize = bufferReader.offset + header.contentSize;
        let args = [];
        let headerArg = new headerHelpers.IpcPacketBufferHeader();
        while (bufferReader.offset < offsetContentSize) {
            headerArg.readHeader(bufferReader.buffer, bufferReader.offset);
            let arg = IpcPacketBuffer._to(headerArg, bufferReader);
            args.push(arg);
        }
        return args;
    }
}