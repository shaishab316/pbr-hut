import ngeohash from 'ngeohash';

const CITY_PRECISION = 4;

const encodeGeohash = (lat: number, lng: number): string =>
  ngeohash.encode(lat, lng, CITY_PRECISION);

const getNeighbors = (geohash: string): string[] => ngeohash.neighbors(geohash);

const getCitySearchCells = (geohash: string): string[] => [
  geohash,
  ...ngeohash.neighbors(geohash),
];

export const GeohashUtil = {
  encodeGeohash,
  getNeighbors,
  getCitySearchCells,
};
