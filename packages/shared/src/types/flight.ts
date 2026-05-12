/** Aircraft cabin class */
export enum CabinClass {
  ECONOMY = 'ECONOMY',
  BUSINESS = 'BUSINESS',
}

/** Source of flight/price data */
export enum DataSource {
  API_DIRECT = 'API_DIRECT',
  AGGREGATOR = 'AGGREGATOR',
  SCRAPER = 'SCRAPER',
}

/** Core flight entity */
export interface Flight {
  readonly id: string;
  readonly airline: string;
  readonly flight_number: string;
  readonly origin: string;
  readonly destination: string;
  readonly departure_at: Date;
  readonly arrival_at: Date;
  readonly duration_min: number;
  readonly cabin_class: CabinClass;
  readonly stops: number;
  readonly available_seats: number;
  readonly price: number;
  readonly currency: string;
  readonly fetched_at: Date;
  readonly source: DataSource;
}

/** Parameters for flight search */
export interface SearchParams {
  readonly origin: string;
  readonly destination: string;
  readonly departure_date: string;
  readonly return_date?: string;
  readonly cabin_class: CabinClass;
  readonly passengers: number;
  readonly max_stops?: number;
  readonly max_price?: number;
  readonly preferred_airlines?: readonly string[];
}

/** Search result returned to client */
export interface SearchResult {
  readonly flights: readonly Flight[];
  readonly total_count: number;
  readonly min_price: number;
  readonly max_price: number;
  readonly search_id: string;
  readonly cached: boolean;
  readonly fetched_at: Date;
}
