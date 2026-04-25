import { useState, useCallback } from 'react';

function getDailyPm25Max(dates = [], airQualityData = {}) {
  return dates.map((dateStr) => {
    let maxPm = null;

    if (airQualityData.hourly?.time) {
      airQualityData.hourly.time.forEach((timestamp, index) => {
        if (timestamp.startsWith(dateStr) && airQualityData.hourly.pm2_5[index] != null) {
          if (maxPm === null || airQualityData.hourly.pm2_5[index] > maxPm) {
            maxPm = airQualityData.hourly.pm2_5[index];
          }
        }
      });
    }

    return maxPm !== null ? Math.round(maxPm) : Math.round(airQualityData.current?.pm2_5 || 0);
  });
}

export function useWeatherData() {
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  const fetchWeatherByCoords = useCallback(async (lat, lon) => {
    try {
      setLoadingWeather(true);
      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,visibility,is_day&minutely_15=precipitation,precipitation_probability&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,pm2_5,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max&forecast_days=7&timezone=Asia%2FBangkok`;
      const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5&hourly=pm2_5&forecast_days=7&timezone=Asia%2FBangkok`;

      const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);
      const [wData, aData] = await Promise.all([wRes.json(), aRes.json()]);

      if (wRes.ok && aRes.ok) {
        const currentTime = wData.current?.time || new Date().toISOString();
        const hourlyTimes = wData.hourly?.time || [];
        const exactHourIndex = hourlyTimes.findIndex((time) => time === currentTime);
        const fallbackHourIndex = hourlyTimes.findIndex((time) => time.slice(0, 13) === currentTime.slice(0, 13));
        const currentHourIndex = exactHourIndex >= 0 ? exactHourIndex : Math.max(0, fallbackHourIndex);
        const isDaytime = Number(wData.current?.is_day ?? 1) === 1;
        const currentUv = isDaytime ? Number(wData.hourly?.uv_index?.[currentHourIndex] || 0) : 0;

        setWeatherData({
          current: {
            temp: wData.current.temperature_2m,
            feelsLike: wData.current.apparent_temperature,
            humidity: wData.current.relative_humidity_2m,
            windSpeed: wData.current.wind_speed_10m,
            windDirection: wData.current.wind_direction_10m,
            pressure: wData.current.surface_pressure,
            visibility: wData.current.visibility,
            uv: Number.isFinite(currentUv) ? Math.round(currentUv * 10) / 10 : 0,
            pm25: aData.current.pm2_5,
            sunrise: wData.daily.sunrise[0],
            sunset: wData.daily.sunset[0],
            rainProb: wData.hourly.precipitation_probability[currentHourIndex],
            precipitation: wData.current.precipitation,
            rain: wData.current.rain || 0,
            weatherCode: wData.current.weather_code,
            isDay: isDaytime,
          },
          hourly: {
            time: wData.hourly.time,
            temperature_2m: wData.hourly.temperature_2m,
            apparent_temperature: wData.hourly.apparent_temperature,
            precipitation_probability: wData.hourly.precipitation_probability,
            precipitation: wData.hourly.precipitation,
            pm25: aData.hourly.pm2_5,
            wind_speed_10m: wData.hourly.wind_speed_10m,
            relative_humidity_2m: wData.hourly.relative_humidity_2m,
            uv_index: wData.hourly.uv_index,
          },
          minutely: {
            time: wData.minutely_15?.time || [],
            precipitation_probability: wData.minutely_15?.precipitation_probability || [],
            precipitation: wData.minutely_15?.precipitation || [],
          },
          daily: {
            time: wData.daily.time,
            weathercode: wData.daily.weather_code,
            temperature_2m_max: wData.daily.temperature_2m_max,
            temperature_2m_min: wData.daily.temperature_2m_min,
            apparent_temperature_max: wData.daily.apparent_temperature_max,
            apparent_temperature_min: wData.daily.apparent_temperature_min,
            pm25_max: getDailyPm25Max(wData.daily.time || [], aData),
            precipitation_probability_max: wData.daily.precipitation_probability_max,
            precipitation_sum: wData.daily.precipitation_sum,
            uv_index_max: wData.daily.uv_index_max,
            wind_speed_10m_max: wData.daily.wind_speed_10m_max,
            sunrise: wData.daily.sunrise,
            sunset: wData.daily.sunset,
          },
          coords: { lat, lon },
        });
      }
    } catch (err) {
      console.error('Fetch local weather failed', err);
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  return { weatherData, loadingWeather, fetchWeatherByCoords };
}
