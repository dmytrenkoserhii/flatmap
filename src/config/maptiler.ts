const apiKey = import.meta.env.VITE_MAPTILER_API_KEY?.trim()

export const mapTilerApiKey = apiKey || null
