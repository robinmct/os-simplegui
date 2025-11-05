// File System Operations Handler
class FileSystemClass {
    async readFile(fileName) {
        return await window.electronAPI.readFile(fileName);
    }

    async writeFile(fileName, content) {
        return await window.electronAPI.writeFile(fileName, content);
    }

    async deleteFile(fileName) {
        return await window.electronAPI.deleteFile(fileName);
    }

    async listFiles(dirPath = '') {
        return await window.electronAPI.listFiles(dirPath);
    }
}

// Create global instance
const FileSystem = new FileSystemClass();
