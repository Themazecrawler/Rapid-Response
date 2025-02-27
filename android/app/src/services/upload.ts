import { Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { enhancedApi } from './api';

export interface UploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

export class UploadService {
  private defaultOptions: UploadOptions = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'],
  };

  public async pickImage(options: UploadOptions = {}) {
    const mergedOptions = { ...this.defaultOptions, ...options };

    const result = await launchImageLibrary({
      mediaType: 'mixed',
      quality: 1,
      selectionLimit: 1,
    });

    if (result.assets && result.assets[0]) {
      const file = result.assets[0];

      if (!this.validateFile(file, mergedOptions)) {
        throw new Error('Invalid file type or size');
      }

      return file;
    }

    return null;
  }

  public async takePhoto(options: UploadOptions = {}) {
    const mergedOptions = { ...this.defaultOptions, ...options };

    const result = await launchCamera({
      mediaType: 'photo',
      quality: 1,
    });

    if (result.assets && result.assets[0]) {
      const file = result.assets[0];

      if (!this.validateFile(file, mergedOptions)) {
        throw new Error('Invalid file type or size');
      }

      return file;
    }

    return null;
  }

  private validateFile(file: any, options: UploadOptions): boolean {
    if (options.maxSize && file.fileSize > options.maxSize) {
      return false;
    }

    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      return false;
    }

    return true;
  }

  public async uploadFile(alertId: number, file: any) {
    const formData = new FormData();

    formData.append('file', {
      name: file.fileName,
      type: file.type,
      uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
    });

    try {
      const response = await enhancedApi.post(
        `/alerts/${alertId}/attachments`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }
}

export const uploadService = new UploadService();