import { createSlice } from '@reduxjs/toolkit';
import { createChatbotLead } from '@/store/chatbotLead/chatbotLeadThunks';
import type { Lead } from '@/types/api';

export interface ChatbotLeadState {
  lead: Lead | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

const initialState: ChatbotLeadState = {
  lead: null,
  loading: false,
  error: null,
  success: false,
};

const chatbotLeadSlice = createSlice({
  name: 'chatbotLead',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetChatbotLeadState: (state) => {
      state.lead = null;
      state.loading = false;
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createChatbotLead.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createChatbotLead.fulfilled, (state, action) => {
        state.loading = false;
        state.lead = action.payload;
        state.success = true;
        state.error = null;
      })
      .addCase(createChatbotLead.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload ?? null;
      });
  },
});

export const { clearError, resetChatbotLeadState } = chatbotLeadSlice.actions;
export default chatbotLeadSlice.reducer;
