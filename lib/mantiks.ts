import axios from "axios";

export const mantiks = axios.create({
	baseURL: "https://api.mantiks.io",
	timeout: 60000,
});

mantiks.interceptors.request.use((config) => {
	const apiKey = process.env.MANTIKS_API_KEY as string | undefined;
	if (!apiKey) {
		throw new Error("MANTIKS_API_KEY is not set in environment");
	}
	config.headers = config.headers ?? {};
	(config.headers as any)["x-api-key"] = apiKey;
	return config;
});

// Simple retry-on-timeout once
mantiks.interceptors.response.use(
	(r) => r,
	async (error) => {
		const config: any = error.config || {};
		const isTimeout =
			error.code === "ECONNABORTED" || error.message?.includes("timeout");
		if (isTimeout && !config.__retried_once) {
			config.__retried_once = true;
			return mantiks.request(config);
		}
		return Promise.reject(error);
	},
);
