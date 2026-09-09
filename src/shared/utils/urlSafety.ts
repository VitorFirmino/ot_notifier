import dns from "node:dns/promises";
import net from "node:net";

export class UnsafeUrlError extends Error {}

const ipv4ToLong = (ip: string): number =>
  ip.split(".").reduce((acc, octet) => (acc << 8) + Number.parseInt(octet, 10), 0) >>> 0;

const isPrivateIpv4 = (ip: string): boolean => {
  const long = ipv4ToLong(ip);
  const inRange = (base: string, bits: number): boolean => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (long & mask) === (ipv4ToLong(base) & mask);
  };

  return (
    inRange("0.0.0.0", 8) || // "this" network
    inRange("10.0.0.0", 8) || // RFC1918
    inRange("100.64.0.0", 10) || // carrier-grade NAT
    inRange("127.0.0.0", 8) || // loopback
    inRange("169.254.0.0", 16) || // link-local (includes cloud metadata 169.254.169.254)
    inRange("172.16.0.0", 12) || // RFC1918
    inRange("192.0.0.0", 24) || // IETF protocol assignments
    inRange("192.168.0.0", 16) || // RFC1918
    inRange("198.18.0.0", 15) || // benchmarking
    inRange("224.0.0.0", 4) || // multicast
    inRange("240.0.0.0", 4) // reserved
  );
};

const isPrivateIpv6 = (ip: string): boolean => {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local (fc00::/7)
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice("::ffff:".length);
    if (net.isIPv4(mapped)) return isPrivateIpv4(mapped);
  }
  return false;
};

const isPrivateIp = (ip: string): boolean => {
  if (net.isIPv4(ip)) return isPrivateIpv4(ip);
  if (net.isIPv6(ip)) return isPrivateIpv6(ip);
  return true; // unrecognized shape — fail closed
};

export const assertPublicHttpUrl = async (rawUrl: string): Promise<void> => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("URL inválida.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError("Apenas URLs http/https são permitidas.");
  }

  const hostname = parsed.hostname;

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new UnsafeUrlError("URL aponta para um endereço de rede privado/local, o que não é permitido.");
    }
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError("Não foi possível resolver o host da URL informada.");
  }

  if (addresses.length === 0 || addresses.some((addressEntry) => isPrivateIp(addressEntry.address))) {
    throw new UnsafeUrlError("URL aponta para um endereço de rede privado/local, o que não é permitido.");
  }
};
