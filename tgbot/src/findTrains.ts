import { Subscription } from "./model"

type Found = {
  Trains: {
    CarGroups: {
      CarTypeName: "КУПЕ" | "ПЛАЦ" | "СВ" | "СИД",
      TotalPlaceQuantity: number,
      MinPrice: number
      HasPlacesForDisabledPersons: boolean
    }[]
    OriginName: string
    DestinationName: string
    DepartureDateTime: string
    ArrivalDateTime: string
    TrainNumber: string
  }[]
}

const dbCarTypes: Record<Found['Trains'][0]['CarGroups'][0]['CarTypeName'], Subscription['dataValues']['filters'][number]['carType']> = {
  "КУПЕ": "coop",
  "ПЛАЦ": "plaz",
  "СВ": "SV",
  "СИД": "sitting"
}

export const findTrains = async (filter: Subscription['dataValues']['filters'][number]) => {
  const { departureDate, destination, origin, carType, maxPrice, originNodeId, destinationNodeId } = filter;

  const url = new URL('https://ticket.rzd.ru/api/v1/railway-service/prices/train-pricing');
  url.searchParams.set('service_provider', 'B2B_RZD')
  url.searchParams.set('getByLocalTime', 'true')
  url.searchParams.set('carGrouping', 'DontGroup')
  url.searchParams.set('origin', origin)
  url.searchParams.set('destination', destination)
  url.searchParams.set('departureDate', departureDate)
  url.searchParams.set('carIssuingType', 'Passenger')
  url.searchParams.set('getTrainsFromSchedule', 'true')
  url.searchParams.set('adultPassengersQuantity', '1')
  url.searchParams.set('childrenPassengersQuantity', '0')
  url.searchParams.set('hasPlacesForLargeFamily', 'false')
  url.searchParams.set('specialPlacesDemand', 'StandardPlacesAndForDisabledPersons')

  const response = await fetch(url)
  if (!response.ok) {
    console.log(response.status, name)
    return
  }
  const { Trains } = await response.json() as Found
  const clear = Trains.map(t => ({
    CarGroups: t.CarGroups.map(g => ({
      CarTypeName: g.CarTypeName,
      TotalPlaceQuantity: g.TotalPlaceQuantity,
      MinPrice: g.MinPrice,
      HasPlacesForDisabledPersons: g.HasPlacesForDisabledPersons,
    })).filter(g => {
      return (
        g.MinPrice <= maxPrice &&
        !g.HasPlacesForDisabledPersons &&
        (!carType || carType === dbCarTypes[g.CarTypeName])
      );
    }),
    OriginName: t.OriginName,
    DestinationName: t.DestinationName,
    DepartureDateTime: t.DepartureDateTime,
    ArrivalDateTime: t.ArrivalDateTime,
    TrainNumber: t.TrainNumber
  }))
  const filtered = clear.filter(t => t.CarGroups.length > 0)
  if (filtered.length === 0) {
    return
  }
  console.log(filtered)
  return `
${filtered[0].OriginName} - ${filtered[0].DestinationName}:

${filtered.map(t => (
`${new Date(t.DepartureDateTime).toLocaleString("ru").slice(0, -3)} -
${new Date(t.ArrivalDateTime).toLocaleString("ru").slice(0, -3)}
Мест для выбранного фильтра: ${t.CarGroups.reduce((acc, g) => acc + g.TotalPlaceQuantity, 0)}
[Ссылка](https://ticket.rzd.ru/searchresults/v/1/${originNodeId}/${destinationNodeId}/${departureDate.slice(0, 10)})`
))
.join('\n\n')}
`
}

export async function findByFilters(filters: Subscription['dataValues']['filters']) {
  const results: string[] = [];
  for (const filter of filters) {
    const result = await findTrains(filter);

    if (result) {
      results.push(result);
    }
  }
  
  if (!results.length) {
    return
  }
  return `
Я нашёл такие билеты:

${results.join('\n\n')}
`
}
