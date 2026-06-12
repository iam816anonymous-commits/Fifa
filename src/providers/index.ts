import { FifaProvider, EspnProvider, BbcProvider } from './matchProviders';
import { GoogleVerificationProvider } from './implementations/GoogleVerificationProvider';
import { ProviderManager } from './providerManager';

export function getMatchProvider(): ProviderManager {
  return new ProviderManager([
    new FifaProvider(),
    new EspnProvider(),
    new BbcProvider(),
    new GoogleVerificationProvider()
  ]);
}
