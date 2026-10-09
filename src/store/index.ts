import { configureStore } from '@reduxjs/toolkit';
import { chatbotLeadReducer } from '@/store/chatbotLead';

export const store = configureStore({
  reducer: {
    chatbotLead: chatbotLeadReducer,
  },
});

export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
