import { CVM } from '../cvm';
const cvm = new CVM();
const cnpj: string[] = [
  '09.625.909/0001-00',
  '24.769.058/0001-62',
  '30.921.203/0001-81',
  '26.673.556/0001-32',
  '34.186.116/0001-89',
  '11.052.478/0001-81',
  '20.403.271/0001-03'
];

test('Get latest infos', async () => {
  let quotas = await cvm.getDailyInfo(cnpj);
  expect(quotas.length).toBe(cnpj.length);
  quotas.forEach((quota, index) => {
    expect<string>(quota.cnpj).toBe(cnpj[index]);
    expect<number>(parseFloat(quota.quotaValue)).toBeGreaterThan(0);
    expect<number>(parseFloat(quota.numberOfShareholders)).toBeGreaterThan(0);
    expect<number>(parseFloat(quota.totalVolume)).toBeGreaterThan(0);
    expect<number>(parseFloat(quota.netAssetVolume)).toBeGreaterThan(0);
    try {
      expect(quota.numberOfShareholders.match(/\r/g)).toBe(null);
    } catch (error: any) {
      throw new Error(`'numberOfShareholders' has a carriage return character`);
    }
  });
}, 15*1000);