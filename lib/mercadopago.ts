import { MercadoPagoConfig, PreApproval } from 'mercadopago';

let _client: MercadoPagoConfig | null = null;

function getClient(): MercadoPagoConfig {
  if (!_client) {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) throw new Error('MP_ACCESS_TOKEN não configurado');
    _client = new MercadoPagoConfig({ accessToken });
  }
  return _client;
}

export function getPreApproval() {
  return new PreApproval(getClient());
}
