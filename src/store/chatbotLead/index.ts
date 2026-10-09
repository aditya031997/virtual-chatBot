import type { RootState } from '@/store';

export { default as chatbotLeadReducer } from '@/store/chatbotLead/chatbotLeadSlice';
export { clearError, resetChatbotLeadState } from '@/store/chatbotLead/chatbotLeadSlice';
export { createChatbotLead } from '@/store/chatbotLead/chatbotLeadThunks';
export type { ChatbotLeadState } from '@/store/chatbotLead/chatbotLeadSlice';

export const chatbotLeadSelectors = {
  selectLead: (state: RootState) => state.chatbotLead.lead,
  selectLoading: (state: RootState) => state.chatbotLead.loading,
  selectError: (state: RootState) => state.chatbotLead.error,
  selectSuccess: (state: RootState) => state.chatbotLead.success,
};
