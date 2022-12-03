import { JSDOM } from 'jsdom';
import axios, { AxiosResponse } from 'axios';
import { print } from 'printaeu';
import AdmZip from 'adm-zip';

if (!process.env.CVM_FUNDS || !process.env.CVM_QUOTAS) {
  throw new Error(`No dotenv file loaded`);
}

/**
 * Access URLs
 */
const url = {
  funds: process.env.CVM_FUNDS,
  dailyInfo: process.env.CVM_QUOTAS
}

/**
 * Quota response
 */
interface QuotaValue {
  /**
   * The value's date
   */
  date: string
  /**
   * The value of each quota
   */
  value: number
}

/**
 * Fund data type
 */
interface FundData {
  /**
   * Administer
   */
  a: string
  /**
   * CNPJ
   */
  c: string
  /**
   * Group
   */
  g: string
  /**
   * i
   */
  i: 1,
  /**
   * Name
   */
  n: string
  /**
   * Equity
   */
  p: number
  /**
   * Shareholders
   */
  q: number
  /**
   * t
   */
  t: number
}

/**
 * CVM manager
 */
export class CVM {

  /**
   * Retrieve the last available quota for one or more CNPJs
   * @param cnpjs one or more CNPJs to retrieve the last quota value balance
   * @returns a `Promise` that resolves to a `QuotaValue` or `QuotaValue[]`. Returns empty array
   * if no CNPJ match
   */
  getQuota = async (cnpjs: string | string[]): Promise<QuotaValue[]> => {

    let quotaValues: QuotaValue[] = [];
    let doc: Document, rows;

    try {
      doc = (new JSDOM((await axios.get(url.dailyInfo)).data)).window.document;
      let querySelector: HTMLTableSectionElement | null = doc.querySelector("body > div.wrapper > pre");
      if (!querySelector) throw new Error(`The page is not as expected`);
      rows = querySelector.children;

      if (rows.length) {
        let lastItem = rows.item(rows.length - 1) as HTMLAnchorElement | null;;
        if (lastItem) {
          let lastFileURL = lastItem.href;

          if (!lastFileURL) throw new Error(`[CV] No last file found`);

          if (!Array.isArray(cnpjs)) cnpjs = [cnpjs];

          // TODO Now the files are zipped
          print.log(`[AS] Getting file '${`${url.dailyInfo}/${lastFileURL}`}'`)
          var zip = new AdmZip(`${url.dailyInfo}/${lastFileURL}`);
          var zipEntries = zip.getEntries(); // an array of ZipEntry records

          zipEntries.forEach(function (zipEntry) {
              console.log(zipEntry.toString()); // outputs zip entries information
              if (zipEntry.entryName == "my_file.txt") {
                  console.log(zipEntry.getData().toString("utf8"));
              }
          });
          // await axios.get(`${url.dailyInfo}/${lastFileURL}`, {responseType: 'arraybuffer'})
          // .then(res => {
          //   if (res && res.data) {
          //     try {
                
          //       let rows: string[] = res.data.split('\n');
          //       for (let i = 0; i < cnpjs.length; i++) {

          //         let cnpj = cnpjs[i];

          //         if (!cnpj.match(/\d+\.\d+\.\d+\/\d+-\d+/)) {
          //           let match = cnpj.match(/\d+/g);
          //           if (match) {
          //             cnpj = match.join('')
          //                         .split('')
          //                         .splice(2, 0, '.')
          //                         .splice(6, 0, '.')
          //                         .splice(10, 0, '/')
          //                         .splice(15, 0, '-')
          //                         .join('');
          //           }
          //         }

          //         for (let i = rows.length - 1; i >= 0; i--) {
          //           const row = rows[i];
          //           if (row.indexOf(cnpj) !== -1) {
          //             let infos = row.split(';');
          //             quotaValues.push({
          //               date: infos[2],
          //               value: parseFloat(infos[4])
          //             });
          //             break;
          //           }
          //         }
          //       }
          //     } catch (error: any) {
          //       throw new Error("Error parsing the CVM file: " + error.message);
          //     }
          //   }
          // })
          // .catch((err: any) => {
          //   throw new Error("Error getting the last CVM file: " + err.message);
          // });

        }

      } else {
        throw new Error("Got the CVM page, but couldn't get the files list");
      }

    } catch (error) {
      print.red(`[CV] Error getting CNPJ's quotas`);
      if (error instanceof Error) {
        print.track(error);
      } else {
        console.log(error);
      }
      throw error;
    }

    if (!quotaValues.length) print.yellow(`[CV] No CNPJ quotas found`);

    return quotaValues;
  };

}