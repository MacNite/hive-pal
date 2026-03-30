import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.interface';

@Injectable()
export class AiService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async analyzeInspectionAudio(inspectionId: string, audioId: string) {
    const enabled = this.config.get<string>('AI_ENABLED') === 'true';
    if (!enabled) throw new BadRequestException('AI is disabled');

    const audio = await this.prisma.inspectionAudio.findFirst({
      where: { id: audioId, inspectionId },
    });

    if (!audio) {
      throw new NotFoundException('Audio not found');
    }

    const downloadUrl = await this.storage.generateDownloadUrl(audio.storageKey, 900);

    const audioResponse = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
    });

    const form = new FormData();
    form.append('file', Buffer.from(audioResponse.data), {
      filename: audio.fileName,
      contentType: audio.mimeType,
    });

    const aiUrl = `${this.config.get<string>('AI_SERVICE_URL')}/process-upload`;

    const result = await firstValueFrom(
      this.http.post(aiUrl, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.config.get<string>('AI_SERVICE_API_KEY')}`,
        },
        timeout: Number(this.config.get('AI_REQUEST_TIMEOUT_MS') || 300000),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }),
    );

    await this.prisma.inspectionAudio.update({
      where: { id: audio.id },
      data: {
        transcriptionStatus: 'COMPLETED',
        transcription: result.data?.transcript?.text ?? null,
      },
    });

    return result.data;
  }
}