import apiClient from '@/utils/api/core/apiClient';
import { ENDPOINTS, HTTP_STATUS } from '@/utils/api/apiConfig';
import { handleApiError } from '@/utils/api/errorHandler';
import type { ApiResult, Lead, LeadInput } from '@/types/api';

class ChatbotLeadApiHandler {
  async create(lead: LeadInput): Promise<ApiResult<Lead>> {
    try {
      const response = await apiClient.post<Lead>(ENDPOINTS.chatbotLead.create, lead);

      if (response.status === HTTP_STATUS.OK || response.status === HTTP_STATUS.CREATED) {
        return { success: true, data: response.data };
      }

      return { success: false, error: 'Unexpected response from server.' };
    } catch (error) {
      const errorMessage = handleApiError(error);
      return { success: false, error: errorMessage };
    }
  }
}

export const chatbotLeadApi = new ChatbotLeadApiHandler();

export const { create } = chatbotLeadApi;
