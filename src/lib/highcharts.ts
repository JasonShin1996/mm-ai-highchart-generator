/**
 * Highcharts 單一入口 —— 以 npm 套件取代過去的 CDN 全域。
 *
 * 在此集中匯入所需模組（side-effect import 會在 v12 ESM 下自動註冊到
 * Highcharts 命名空間），其餘程式碼一律 `import Highcharts from '@/lib/highcharts'`，
 * 確保模組只註冊一次、且具備完整型別。
 */
import Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import 'highcharts/modules/exporting';
import 'highcharts/modules/accessibility';

export default Highcharts;
export { Highcharts };
