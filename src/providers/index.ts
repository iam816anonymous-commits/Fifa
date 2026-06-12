import { FifaProvider, EspnProvider, BbcProvider } from './matchProviders';
import { ProviderManager } from './providerManager';

export function getMatchProvider(): ProviderManager {
  return new ProviderManager([
    new FifaProvider(),
    new EspnProvider(),
    new BbcProvider()
  ]);
}
