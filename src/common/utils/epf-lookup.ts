
// In-memory cache for VIEWSTATE and EVENTVALIDATION
const viewStateCache = new Map<string, { viewState: string; eventValidation: string; viewStateGenerator: string; timestamp: number }>();
const VIEWSTATE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export class EpfLookup {
  /**
   * Formats the employer number to the pattern X/00000
   * e.g., A/123 -> A/00123
   */
  static formatEmployerNo(employerNo: string): { zn: string; em: string } {
    const parts = employerNo.split('/');
    if (parts.length !== 2) {
      throw new Error('Invalid employer number format. Expected X/Number');
    }
    
    const zn = parts[0].trim();
    const em = parts[1].trim().padStart(5, '0');
    
    return { zn, em };
  }

  /**
   * Helper to execute a single lookup attempt
   */
  private static async executeLookup(
    employerNo: string,
    period: string,
  ): Promise<{ referenceNo: string | null; name: string | null }> {
    try {
      const { zn: employer_no_zn, em: employer_no_number } = this.formatEmployerNo(employerNo);
      const formattedPeriod = period.replace('-', '');

      // Try to get cached VIEWSTATE and EVENTVALIDATION first
      let viewState = '';
      let eventValidation = '';
      let viewStateGenerator = '7BA8A1FC'; // Fallback
      let usedCachedViewState = false;

      const viewStateCacheKey = 'cbsl_viewstate';
      const cachedViewState = viewStateCache.get(viewStateCacheKey);

      if (cachedViewState && Date.now() - cachedViewState.timestamp < VIEWSTATE_CACHE_TTL) {
        console.log('[EpfLookup] Using cached VIEWSTATE and EVENTVALIDATION');
        viewState = cachedViewState.viewState;
        eventValidation = cachedViewState.eventValidation;
        viewStateGenerator = cachedViewState.viewStateGenerator || viewStateGenerator;
        usedCachedViewState = true;
      } else {
        console.log('[EpfLookup] Fetching fresh VIEWSTATE and EVENTVALIDATION');
        // Fetch fresh VIEWSTATE and EVENTVALIDATION
        const initialResponse = await fetch('https://www.cbsl.lk/EPFCRef/', {
          headers: {
            accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'en-LK,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,si;q=0.6',
            'cache-control': 'no-cache',
            Referer: 'https://www.cbsl.lk/EPFCRef/',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          },
          method: 'GET',
        });

        if (!initialResponse.ok) {
          throw new Error(`Failed to fetch initial page: ${initialResponse.statusText}`);
        }

        const initialText = await initialResponse.text();

        // Extract VIEWSTATE, EVENTVALIDATION, and VIEWSTATEGENERATOR dynamically
        const viewStateMatch = initialText.match(/id="__VIEWSTATE"[^>]*value="([^"]*)"/);
        const eventValidationMatch = initialText.match(/id="__EVENTVALIDATION"[^>]*value="([^"]*)"/);
        const generatorMatch = initialText.match(/id="__VIEWSTATEGENERATOR"[^>]*value="([^"]*)"/);

        if (!viewStateMatch || !eventValidationMatch) {
          throw new Error('Failed to extract VIEWSTATE or EVENTVALIDATION from the page');
        }

        viewState = viewStateMatch[1];
        eventValidation = eventValidationMatch[1];
        if (generatorMatch) viewStateGenerator = generatorMatch[1];

        // Cache the VIEWSTATE and EVENTVALIDATION
        viewStateCache.set(viewStateCacheKey, {
          viewState,
          eventValidation,
          viewStateGenerator,
          timestamp: Date.now(),
        });
      }

      const requestBody = `__VIEWSTATE=${encodeURIComponent(viewState)}&__VIEWSTATEGENERATOR=${encodeURIComponent(viewStateGenerator)}&__EVENTVALIDATION=${encodeURIComponent(eventValidation)}&zn=${employer_no_zn}&em=${employer_no_number}&mn=${formattedPeriod}&sb=1&checkb=Get+Reference`;

      console.log(`[EpfLookup] Sending POST request for period ${formattedPeriod}`);

      const response = await fetch('https://www.cbsl.lk/EPFCRef/', {
        headers: {
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'accept-language': 'en-LK,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,si;q=0.6',
          'cache-control': 'no-cache',
          'content-type': 'application/x-www-form-urlencoded',
          Referer: 'https://www.cbsl.lk/EPFCRef/',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
        body: requestBody,
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const text = await response.text();
      
      // Extract employer name
      const nameMatch = text.match(/id=["'](?:empnm|lblEmployerName)["'][^>]*>(.*?)<\/span>/i);
      let employer_name = nameMatch ? nameMatch[1].replace(/<[^>]*>/g, '').trim() : null;
      if (employer_name && employer_name.includes(':')) {
        employer_name = employer_name.split(':')[1].trim();
      }

      // Extract reference number
      const refMatch = text.match(/id=["'](?:refno|lblRefNo)["'][^>]*>(.*?)<\/span>/i);
      let reference_no = refMatch ? refMatch[1].replace(/<[^>]*>/g, '').trim() : null;
      if (reference_no && reference_no.includes(':')) {
        reference_no = reference_no.split(':')[1].trim();
      }

      return { referenceNo: reference_no, name: employer_name };
    } catch (error) {
      console.error('[EpfLookup] Internal lookup error:', error);
      throw error;
    }
  }

  /**
   * Fetches the company name with month fallback
   */
  static async fetchCompanyName(
    employerNo: string,
    period: string,
    retryCount = 3,
  ): Promise<string | null> {
    try {
      console.log(`[EpfLookup] Fetching Name for: ${employerNo}, Period: ${period} (Retries left: ${retryCount})`);
      const result = await this.executeLookup(employerNo, period);
      
      if (result.name) return result.name;

      if (retryCount > 0) {
        const formattedPeriod = period.replace('-', '');
        const year = parseInt(formattedPeriod.substring(0, 4));
        const month = parseInt(formattedPeriod.substring(4, 6));
        
        let prevYear = year;
        let prevMonth = month - 1;
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear -= 1;
        }
        
        const prevPeriod = `${prevYear}${prevMonth.toString().padStart(2, '0')}`;
        return await this.fetchCompanyName(employerNo, prevPeriod, retryCount - 1);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetches the reference number strictly for the given period
   */
  static async fetchReferenceNo(
    employerNo: string,
    period: string,
  ): Promise<string | null> {
    try {
      console.log(`[EpfLookup] Fetching Reference No for: ${employerNo}, Period: ${period} (Strict)`);
      const result = await this.executeLookup(employerNo, period);
      return result.referenceNo;
    } catch (error) {
      return null;
    }
  }
}
