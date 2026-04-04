class FileUtils {

  static magicBytes = {
    'duckdb': {offset: 7, magic: 'DUCK'},
    'parquet': {offset: 0, magic: 'PAR1'},
    'sqlite': {offset: 0, magic: 'SQLite format 3\0'}
  };
  
  static async checkMagicBytes(text){
    const keys = Object.keys(FileUtils.magicBytes);
    
    return await keys.find(async key => {
      const data = FileUtils.magicBytes[key];
      const minLength = data.offset + data.magic.length;
      
      if (typeof text === 'string') {
        if (textLength < minLength) {
          return false;
        }
        const textSlice = text.slice(data.offset, minLength);
        return textSlice === data.magic;
      }
      
      if (text instanceof File){
        const file = text;
        if (file.size < minLength) {
          return false;
        }
        const fileSlice = file.slice(data.offset, minLength);
        const fileText = await fileSlice.text();
        return fileText === data.magic;
      }
    });
  }

  static #fileSizeFormatter = new Intl.NumberFormat(
    navigator.language, {
      style: 'unit',
      notation: 'compact',
      unit: 'byte',
      unitDisplay: 'narrow'
    }
  );
  
  static getFileNameParts(fileName){
    if (fileName instanceof File) {
      fileName = fileName.name;
    }

    const separator = '.';
    const fileNameParts = fileName.split( separator );
    if (fileNameParts.length < 2){
      return undefined;
    }
    const extension = fileNameParts.pop();
    const lowerCaseExtension = extension.toLowerCase();
    const fileNameWithoutExtension = fileNameParts.join( separator );
    return {
      extension: extension,
      lowerCaseExtension: lowerCaseExtension,
      fileNameWithoutExtension: fileNameWithoutExtension
    };
  }

  static formatFileSize(fileOrSize) {
    if (fileOrSize instanceof File) {
      fileOrSize = fileOrSize.size;
    }
    
    if (typeof fileOrSize !== 'number'){
      return undefined;
    }
    
    const formattedFileSize = FileUtils.#fileSizeFormatter.format(fileOrSize);
    return formattedFileSize.endsWith('BB') ? formattedFileSize.replace(/BB/, 'GB') : formattedFileSize;
  }
  
  static async unwrapFileSystemHandleToFile(file){
    if (file instanceof Array){
      return await Promise.all(file.map(
        file => file instanceof FileSystemFileHandle ? file.getFile() : file
      ));
    }
    else 
    if (file instanceof FileSystemFileHandle){  
      return await file.getFile();
    }
    const typeOfFile = typeof file;
    const argumentLabel = file === null ? 'null' : (typeOfFile === 'object' ? file.constructor.name : typeofFile);
    throw new TypeError(`Invalid argument! Expected array or FileSystemFileHandle - not ${argumentLabel}.`);
  }
}