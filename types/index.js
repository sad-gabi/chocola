const iconsType = "home" | "search" | "menu" | "settings" | "favorite" | "account_circle" | "shopping_cart" | "notifications" | "info" | "help" | "exit_to_app" | "check_circle" | "close" | "edit" | "delete" | "add" | "arrow_back" | "arrow_forward" | "play_arrow" | "pause" | "stop" | "camera_alt" | "photo" | "alarm" | "event" | "attach_file" | "print" | "share" | "cloud" | "cloud_upload" | "cloud_download" | "lock" | "lock_open" | "visibility" | "visibility_off" | "phone" | "email" | "map" | "place" | "directions" | "train" | "directions_car" | "directions_bike" | "school" | "work" | "lightbulb" | "battery_full" | "battery_std" | "wifi" | "bluetooth";
const iconsArray = [
        "home", "search", "menu", "settings", "favorite", "account_circle",
        "shopping_cart", "notifications", "info", "help", "exit_to_app",
        "check_circle", "close", "edit", "delete", "add", "arrow_back",
        "arrow_forward", "play_arrow", "pause", "stop", "camera_alt",
        "photo", "alarm", "event", "attach_file", "print", "share",
        "cloud", "cloud_upload", "cloud_download", "lock", "lock_open",
        "visibility", "visibility_off", "phone", "email", "map", "place",
        "directions", "train", "directions_car", "directions_bike", "school",
        "work", "lightbulb", "battery_full", "battery_std", "wifi", "bluetooth"
];
/**
 * An instrinsic object that contains chocola types
 */
const ct = {};
/**
 * Creates an interface for the component static context
 * @param {object} ctxInterface 
 */
ct.defCtx = (ctxInterface) => {
        if (!ctxInterface) return undefined;
        if (typeof ctxInterface !== "object") return;
        return ctxInterface;
}

ct.Number = class Number {
        /**
         * @param {number} value 
         * @returns 
         */
        constructor(value) {
                if (!value) return undefined;
                if (typeof value !== "number") return;
                return value;
        }
        /**
         * @param {number} min 
         * @param {number} max 
         * @returns {number}
         */
        clamp(min, max) {
                return Math.min(Math.max(this.value, min), max);
        }
        /**
         * @param {number} min 
         * @returns {number}
         */
        min(min) {
                return Math.min(this.value, min);
        }
        /**
         * @param {number} max 
         * @returns {number}
         */
        max(max) {
                return Math.max(this.value, max);
        }
}
/**
 * @param {number} value 
 */
ct.Float = (value) => {
        if (!value) return undefined;
        if (Number.isInteger(value)) return;
        return value;
}
/**
 * @param {number} value 
 */
ct.Int = (value) => {
        if (!value) return undefined;
        if (!Number.isInteger(value)) return;
        return value;
}
/**
 * @param {string} value 
 */
ct.String = (value) => {
        if (!value) return undefined;
        if (typeof value !== "string") return;
        return value;
}
/**
 * @param {boolean} value 
 */
ct.Boolean = (value) => {
        if (value === null) return undefined;
        if (typeof value !== "boolean") return;
        return value;
}
/**
 * @param {object} value 
 */
ct.Object = (value) => {
        if (!value) return undefined;
        if (typeof value !== "object") return;
        return value;
}
/**
 * @param {function} value 
 */
ct.Function = (value) => {
        if (!value) return undefined;
        if (typeof value !== "function") return;
        return value;
}
/**
 * @param {symbol} value 
 */
ct.Symbol = (value) => {
        if (!value) return undefined;
        if (typeof value !== "symbol") return;
        return value;
}
/**
 * @param {URLPattern | "none"} value 
 */
ct.Url = (value) => {
        if (!value) return undefined;
        if (!value.startsWith("http://") || !value.startsWith("https://")) return;
        return value;
}
/**
 * 
 * @param {"home" | "search" | "menu" | "settings" | "favorite" | "account_circle" | "shopping_cart" | "notifications" | "info" | "help" | "exit_to_app" | "check_circle" | "close" | "edit" | "delete" | "add" | "arrow_back" | "arrow_forward" | "play_arrow" | "pause" | "stop" | "camera_alt" | "photo" | "alarm" | "event" | "attach_file" | "print" | "share" | "cloud" | "cloud_upload" | "cloud_download" | "lock" | "lock_open" | "visibility" | "visibility_off" | "phone" | "email" | "map" | "place" | "directions" | "train" | "directions_car" | "directions_bike" | "school" | "work" | "lightbulb" | "battery_full" | "battery_std" | "wifi" | "bluetooth"} value 
 * @returns 
 */
ct.Icon = (value) => {
        if (!value) return "help";
        if (!iconsArray.includes(value)) return "help";
        return value;
}

export default ct;