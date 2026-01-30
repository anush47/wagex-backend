"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipUserCheck = exports.SKIP_USER_CHECK_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.SKIP_USER_CHECK_KEY = 'skipUserCheck';
const SkipUserCheck = () => (0, common_1.SetMetadata)(exports.SKIP_USER_CHECK_KEY, true);
exports.SkipUserCheck = SkipUserCheck;
//# sourceMappingURL=skip-user-check.decorator.js.map