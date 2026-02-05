"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveRequestType = exports.LeaveStatus = void 0;
var LeaveStatus;
(function (LeaveStatus) {
    LeaveStatus["PENDING"] = "PENDING";
    LeaveStatus["APPROVED"] = "APPROVED";
    LeaveStatus["REJECTED"] = "REJECTED";
    LeaveStatus["CANCELLED"] = "CANCELLED";
})(LeaveStatus || (exports.LeaveStatus = LeaveStatus = {}));
var LeaveRequestType;
(function (LeaveRequestType) {
    LeaveRequestType["FULL_DAY"] = "FULL_DAY";
    LeaveRequestType["HALF_DAY_FIRST"] = "HALF_DAY_FIRST";
    LeaveRequestType["HALF_DAY_LAST"] = "HALF_DAY_LAST";
    LeaveRequestType["SHORT_LEAVE"] = "SHORT_LEAVE";
})(LeaveRequestType || (exports.LeaveRequestType = LeaveRequestType = {}));
//# sourceMappingURL=leave.enum.js.map