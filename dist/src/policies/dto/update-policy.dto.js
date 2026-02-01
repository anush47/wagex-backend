"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePolicyDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_policy_dto_1 = require("./create-policy.dto");
class UpdatePolicyDto extends (0, swagger_1.PartialType)(create_policy_dto_1.CreatePolicyDto) {
}
exports.UpdatePolicyDto = UpdatePolicyDto;
//# sourceMappingURL=update-policy.dto.js.map