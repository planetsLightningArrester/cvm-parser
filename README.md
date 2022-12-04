# Brazilian CVM info - (Comissão de Valores Mobiliários)

Crawler to get CVM info by company's CNPJ

> Note: There's no official API to retrieve this data AFAIK

## Example result
```JS
FundInfo {
  "type": "FI",
  "cnpj": "09.625.909/0001-00",
  "date": "2022-12-01",
  "totalVolume": "311867432.06",
  "quotaValue": "3.989299900000",
  "netAssetVolume": "310746105.31",
  "dailyFundraising": "689834.58",
  "dailyWithdraw": "689834.58",
  "numberOfShareholders": "23973"
}
``` 

## Install
> npm i cvm-parser

## Usage

### Full example
```Typescript
import { CVM } from 'cvm-parser';

async function main() {

  console.log(`CVM Parser - GNU GPLv3`);
  
  const cvm = new CVM();
  try {

    const cnpj: string[] = [
      '09.625.909/0001-00',
      '24.769.058/0001-62',
      '30.921.203/0001-81',
      '26.673.556/0001-32',
      '34.186.116/0001-89',
      '11.052.478/0001-81',
      '20.403.271/0001-03'
    ];

    let assets = await cvm.getDailyInfo(cnpj);
    console.log(assets)

  } catch (error) {
    console.error(error);
  }
}

main();
```

## Disclaimer
Personal data is not stored neither used in tests

## Thanks? U welcome
Consider thanking me: send a "Thanks!" 👋 by [PIX](https://www.bcb.gov.br/en/financialstability/pix_en) 😊
> a09e5878-2355-45f7-9f36-6df4ccf383cf

## License
As license, this software is provided as is, free of charge, **without any warranty whatsoever**. Its author is not responsible for its usage. Use it by your own risk.

[GNU GPLv3](https://choosealicense.com/licenses/gpl-3.0/)
