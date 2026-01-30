import { SetMetadata } from '@nestjs/common';

export const SKIP_USER_CHECK_KEY = 'skipUserCheck';
export const SkipUserCheck = () => SetMetadata(SKIP_USER_CHECK_KEY, true);
