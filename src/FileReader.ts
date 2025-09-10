// FileReader.ts - Generic file reader for text files and metadata
export class FileReader {
  fileName: string;
  fileType: string;
  fileContent: string;
  metadata: Record<string, any>;

  constructor(fileName: string, fileContent: string, fileType = "text/plain") {
    this.fileName = fileName;
    this.fileType = fileType;
    this.fileContent = fileContent;
    this.metadata = {};
    this.extractMetadata();
  }

  extractMetadata() {
    // Placeholder: subclasses or users can override/extend
    this.metadata.size = this.fileContent.length;
    this.metadata.name = this.fileName;
    this.metadata.type = this.fileType;
  }

  getContent() {
    return this.fileContent;
  }

  getMetadata() {
    return this.metadata;
  }
}
