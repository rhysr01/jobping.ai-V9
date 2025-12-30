import { mantiks } from "./mantiks";

const locationCache = new Map<string, number>();

export async function resolveLocationId(
	q: string,
): Promise<number | undefined> {
	if (locationCache.has(q)) return locationCache.get(q);
	try {
		const { data } = await mantiks.get("/location/search", { params: { q } });
		const id = data?.locations?.[0]?.id as number | undefined;
		if (id) locationCache.set(q, id);
		return id;
	} catch {
		return undefined;
	}
}
