import { JSDOM } from 'jsdom';
import axios from 'axios';
import { print } from 'printaeu';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Access URLs
 */
const url = {
  funds: Buffer.from('aHR0cHM6Ly92ZXJpb3MuZWFzeW52ZXN0LmlvL3Zlcmlvcy9jdm0', 'base64').toString('utf-8'),
  dailyInfo: Buffer.from('aHR0cDovL2RhZG9zLmN2bS5nb3YuYnIvZGFkb3MvRkkvRE9DL0lORl9ESUFSSU8vREFET1Mv', 'base64').toString('utf-8')
}

/**
 * Quota response
 */
export class FundInfo {
  /**
   * Fund type. Usually it's `FACFIF`, `FAPI`, `FI`, or `FIF`
   */
  type: string;
  /**
   * Fund CNPJ formatted
   * @example "00.017.024/0001-53"
   */
  cnpj: string;
  /**
   * The info date
   * @example "2022-11-01"
   */
  date: string;
  /**
   * Asset total volume
   */
  totalVolume: string;
  /**
   * The value of each quota. Period (.) as decimal delimiter
   */
  quotaValue: string;
  /**
   * Net asset volume
   */
  netAssetVolume: string;
  /**
   * Daily fundraising
   */
  dailyFundraising: string;
  /**
   * Daily withdraw
   */
  dailyWithdraw: string;
  /**
   * Number of shareholders
   */
  numberOfShareholders: string;

  constructor(type?: string, cnpj?: string, date?: string, totalVolume?: string, quotaValue?: string, netAssetVolume?: string, dailyFundraising?: string, dailyWithdraw?: string, numberOfShareholders?: string) {
    this.type = type || '';
    this.cnpj = cnpj || '';
    this.date = date || '';
    this.totalVolume = totalVolume || '';
    this.quotaValue = quotaValue || '';
    this.netAssetVolume = netAssetVolume || '';
    this.dailyFundraising = dailyFundraising || '';
    this.dailyWithdraw = dailyWithdraw || '';
    this.numberOfShareholders = numberOfShareholders || '';
  }

}

/**
 * CVM manager
 */
export class CVM {

  /**
   * Retrieve the last available quota for one or more CNPJs
   * @param cnpj one or more CNPJs to retrieve the last quota value balance
   * @returns a `Promise` that resolves to a `QuotaValue` or `QuotaValue[]`. Returns empty array
   * if no CNPJ match
   */
  async getDailyInfo(cnpj?: string | string[]): Promise<FundInfo[]> {
    let assets: FundInfo[] = [];
    let raw: string[] = await this.getRawDailyInfo();

    if (cnpj) {
      if (!Array.isArray(cnpj)) cnpj = [cnpj];

      for (let i = 0; i < cnpj.length; i++) {
  
        let _cnpj: string = cnpj[i];
        _cnpj = this.formatCNPJ(_cnpj);
  
        // Starting from the bottom to get the latest daily info
        for (let i = raw.length - 1; i >= 0; i--) {
          const row = raw[i];
          if (row.includes(_cnpj)) {
            assets.push(this.rawToInfo(row));
            break;
          }
        }
      }
    } else {
      raw.forEach(rawInfo => assets.push(this.rawToInfo(rawInfo)) );
    }

    return assets;

  }

  /**
   * Get the raw info from the `.csv` file of the last daily info
   * @returns a `Promise` that resolves into a list of `string`s with the
   * content of each `.csv`'s row
   */
  private async getRawDailyInfo(): Promise<string[]> {

    // Path to store temp files
    let tempPath: string = path.join('/', 'tmp');
    if (!fs.existsSync(tempPath)) tempPath = __dirname;

    /**
     * The path to download the file. It's removed at the end of this 
     */
    const downloadPath: string = path.join(tempPath, `cvm_${(new Date()).getMilliseconds()}.zip`);
    let result: string[] = [];
    
    try {
      
      // Get data from the daily info (it comes in gzip format)
      const res = (await axios.get(url.dailyInfo, { responseType: 'arraybuffer' }));
      // The content comes gzip encoded
      const data = await new Promise<string>((resolve, reject) => {
        zlib.gunzip(res.data, function (_err, output) {
          if (_err) reject(_err);
          else resolve(output.toString());
        })
      });
      // Construct the DOM
      let doc: Document = (new JSDOM(data).window.document);
      // Select the list of all daily info
      let querySelector: HTMLTableSectionElement | null = doc.querySelector("body > div.wrapper > pre");
      if (!querySelector) throw new Error(`The page is not as expected`);
      // The the rows of the list of all daily info
      let rows: HTMLCollection = querySelector.children;

      // Check if the list is valid
      if (rows.length) {
        // Get the most recent daily info
        let lastItem = rows.item(rows.length - 1) as HTMLAnchorElement | null;;
        if (lastItem) {
          // Get the URL of the most recent daily info
          let lastFileURL = lastItem.href;
          if (!lastFileURL) throw new Error(`[CV] No last file found`);

          // Download the zipped file with the .csv info
          const downloadUrl: string = `${url.dailyInfo}/${lastFileURL}`;

          const res = await axios.get(downloadUrl, { responseType: 'arraybuffer' })
          .catch((err: any) => { throw new Error("Error getting the last CVM file: " + err.message) });
          fs.writeFileSync(downloadPath, res.data);

          // Unzip the .csv
          const csv: string = await new Promise<string>(resolve => {
            var zip = new AdmZip(downloadPath);
            var zipEntries = zip.getEntries();
            zipEntries.forEach(zipEntry => {
              resolve(zipEntry.getData().toString("utf8"));
            });
          });

          result = csv.split('\n');

        } else {
          print.yellow(`[CV] Couldn't get the last daily info`);
        }

      } else throw new Error("Got the CVM page, but couldn't get the files list");
      
    } catch (error) {
      print.red(`[CV] Error getting CNPJ's quotas`);
      if (error instanceof Error) {
        print.track(error);
      } else {
        console.log(error);
      }

      // Delete leftovers
      if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);

      throw error;
    }

    // Delete leftovers
    if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);

    return result;

  };

  /**
   * Convert a raw line from the `.csv` file into the `FundDailyInfo` object
   * @param raw the raw line from the `.csv`
   * @returns the parsed line as a `FundDailyInfo` object
   */
  private rawToInfo(raw: string): FundInfo {
    let info: FundInfo = new FundInfo();
    const data = raw.split(';');

    info.type = data[0];
    info.cnpj = data[1];
    info.date = data[2];
    info.totalVolume = data[3];
    info.quotaValue = data[4];
    info.netAssetVolume = data[5];
    info.dailyFundraising = data[6];
    info.dailyWithdraw = data[6];
    info.numberOfShareholders = data[8];
    return info;
  }

  /**
   * Format a CNPJ, if not formatted
   * @param cnpj the CNPJ
   * @returns the parsed CNPJ
   * @example this.formatCNPJ("00017024000153") // => "00.017.024/0001-53"
   */
  private formatCNPJ(cnpj: string): string {
    let _cnpj: string = cnpj;
    if (!_cnpj.match(/\d+\.\d+\.\d+\/\d+-\d+/)) {
      let match = _cnpj.match(/\d+/g);
      if (match) {
        _cnpj = match.join('')
                    .split('')
                    .splice(2, 0, '.')
                    .splice(6, 0, '.')
                    .splice(10, 0, '/')
                    .splice(15, 0, '-')
                    .join('');
      }
    }
    return _cnpj;
  }

}