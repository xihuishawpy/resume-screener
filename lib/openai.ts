import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY!,
  baseURL: process.env.DASHSCOPE_BASE_URL!,
});

export const MODEL_NAME = process.env.MODEL_NAME || "qwen-plus";
