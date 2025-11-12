export interface Station {
  name: string;
  expressCode: string;
  nodeId: string;
}

export async function fetchStationSuggestions(query: string): Promise<Station[]> {
  const url = new URL('https://ticket.rzd.ru/api/v1/suggests');
  url.searchParams.set('Query', query);
  url.searchParams.set('TransportType', 'rail');
  url.searchParams.set('GroupResults', 'true');
  url.searchParams.set('RailwaySortPriority', 'true');
  url.searchParams.set('SynonymOn', '1');
  url.searchParams.set('Language', 'ru');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) throw new Error('Ошибка запроса к API РЖД');

  const data = await res.json();

  const stations: Station[] = [];

  for (const group of ['train', 'avia', 'bus', 'suburban']) {
    if (data[group]) {
      for (const item of data[group]) {
        stations.push({
          name: item.name,
          expressCode: item.expressCode,
          nodeId: item.nodeId,
        })
      }
    }
  }

  return stations;
}