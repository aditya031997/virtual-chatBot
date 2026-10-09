import { createAsyncThunk } from '@reduxjs/toolkit';
import { chatbotLeadApi } from '@/utils/api/handlers/chatbotLeadHandler';
import type { Lead, LeadInput } from '@/types/api';

export const createChatbotLead = createAsyncThunk<
  Lead,
  LeadInput,
  { rejectValue: string }
>(
  'chatbotLead/create',
  async (lead, { rejectWithValue }) => {
    try {
      const response = await chatbotLeadApi.create(lead);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue(response.error);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create chatbot lead';
      return rejectWithValue(message || 'Failed to create chatbot lead');
    }
  }
);
