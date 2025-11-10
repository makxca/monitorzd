import config from "./config.json"

type Found = {
  Trains: {
    CarGroups: { CarTypeName: string, TotalPlaceQuantity: number }[]
    OriginName: string
    DestinationName: string
    DepartureDateTime: string
    ArrivalDateTime: string
  }[]
}

export const findTrains = async (url: string, rzdUrl: string, name?: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    console.log(response.status, name)
    return
  }
  const { Trains } = await response.json() as Found
  const clear = Trains.map(t => ({
    CarGroups: t.CarGroups.map(g => ({
      CarTypeName: g.CarTypeName.toLocaleLowerCase(),
      TotalPlaceQuantity: g.TotalPlaceQuantity,
    })).filter(g => g.CarTypeName.toLocaleLowerCase().includes('плац')),
    OriginName: t.OriginName,
    DestinationName: t.DestinationName,
    DepartureDateTime: t.DepartureDateTime,
    ArrivalDateTime: t.ArrivalDateTime,
  }))
  const filtered = clear.filter(t => t.CarGroups.length > 0)
  if (filtered.length === 0) {
    return
  }
  return `
${filtered[0].OriginName} - ${filtered[0].DestinationName}:

${filtered.map(t => (
`${new Date(t.DepartureDateTime).toLocaleString("ru").slice(0, -3)} -
${new Date(t.ArrivalDateTime).toLocaleString("ru").slice(0, -3)}
Мест на плацкарте: ${t.CarGroups.reduce((acc, g) => acc + g.TotalPlaceQuantity, 0)}
[Ссылка](${rzdUrl})`
))
.join('\n\n')}
`
}

export async function findAll() {
  const results = await (await Promise.all(config.map(url => findTrains(url.url, url.link, url.name)))).filter(r => r) as string[]
  if (!results.length) {
    return
  }
  return `
Я нашёл такие билеты:

${results.join('\n\n')}
`
}
