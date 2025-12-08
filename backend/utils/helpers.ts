/**
 * helpers.ts
 * Utility helper functions for formatting and data manipulation
 */

class Helpers {
    /**
     * Format date to readable string
     */
    static formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }

    /**
     * Format time string
     */
    static formatTime(timeString: string): string {
        if (!timeString || timeString === "-" || timeString === "First") {
            return timeString;
        }
        return timeString;
    }

    /**
     * Format berth notation
     */
    static formatBerth(coachNo: string, seatNo: number | string, berthType: string): string {
        const abbr = this.getBerthTypeAbbr(berthType);
        return `${coachNo}-${seatNo} (${abbr})`;
    }

    /**
     * Get berth type abbreviation
     */
    static getBerthTypeAbbr(berthType: string): string {
        const abbr: { [key: string]: string } = {
            "Lower Berth": "LB",
            "Middle Berth": "MB",
            "Upper Berth": "UB",
            "Side Lower": "SL",
            "Side Upper": "SU",
        };
        return abbr[berthType] || berthType;
    }

    /**
     * Format name (capitalize first letter of each word)
     */
    static formatName(name: string): string {
        return name
            .toLowerCase()
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    /**
     * Format PNR with spaces
     */
    static formatPNR(pnr: string | number): string {
        const pnrStr = String(pnr);
        return pnrStr.replace(/(\d{3})(?=\d)/g, "$1 ");
    }

    /**
     * Generate random PNR
     */
    static generatePNR(): string {
        return Math.floor(1000000000 + Math.random() * 9000000000).toString();
    }

    /**
     * Sanitize input string
     */
    static sanitizeInput(str: string | null | undefined): string {
        if (!str) return "";
        return String(str).trim().replace(/[<>]/g, "");
    }

    /**
     * Validate PNR format
     */
    static isValidPNRFormat(pnr: string | number): boolean {
        const pnrStr = String(pnr).trim();
        return /^\d{10}$/.test(pnrStr);
    }

    /**
     * Get gender display name
     */
    static getGenderDisplay(gender: string | null | undefined): string {
        if (!gender) return "Unknown";
        if (gender === "M") return "Male";
        if (gender === "F") return "Female";
        if (gender === "O") return "Other";
        return gender;
    }

    /**
     * Format class name
     */
    static formatClassName(classCode: string | null | undefined): string {
        if (!classCode) return "Unknown";
        const classNames: { [key: string]: string } = {
            SL: "Sleeper",
            "AC_3_Tier": "AC 3-Tier",
            "3-TierAC": "AC 3-Tier",
            "2A": "AC 2-Tier",
            "2-TierAC": "AC 2-Tier",
            "1A": "AC 1-Tier",
            "1-TierAC": "AC 1-Tier",
            CC: "Chair Car",
            "2S": "Second Sitting",
        };
        return classNames[classCode] || classCode;
    }

    /**
     * Get current timestamp
     */
    static getCurrentTimestamp(): string {
        return new Date().toISOString();
    }

    /**
     * Deep clone object
     */
    static deepClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Check if object is empty
     */
    static isEmpty(obj: object): boolean {
        return Object.keys(obj).length === 0;
    }

    /**
     * Convert array to object by key
     */
    static arrayToObject<T extends { [key: string]: any }>(array: T[], key: keyof T): { [key: string]: T } {
        return array.reduce((obj, item) => {
            obj[item[key] as string] = item;
            return obj;
        }, {} as { [key: string]: T });
    }

    /**
     * Sleep/delay function
     */
    static sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Get random element from array
     */
    static getRandomElement<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Chunk array into smaller arrays
     */
    static chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Calculate percentage
     */
    static calculatePercentage(value: number, total: number): string {
        if (total === 0) return "0.00";
        return ((value / total) * 100).toFixed(2);
    }

    /**
     * Format number with commas
     */
    static formatNumber(num: number): string {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * Truncate string
     */
    static truncate(str: string, maxLength: number): string {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + "...";
    }

    /**
     * Remove duplicates from array
     */
    static removeDuplicates<T>(array: T[]): T[] {
        return [...new Set(array)];
    }

    /**
     * Sort array of objects by property
     */
    static sortByProperty<T>(array: T[], property: keyof T, ascending: boolean = true): T[] {
        return array.sort((a, b) => {
            if (ascending) {
                return a[property] > b[property] ? 1 : -1;
            } else {
                return a[property] < b[property] ? 1 : -1;
            }
        });
    }

    /**
     * Group array by property
     */
    static groupBy<T>(array: T[], property: keyof T): { [key: string]: T[] } {
        return array.reduce((groups, item) => {
            const key = String(item[property]);
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {} as { [key: string]: T[] });
    }
}

module.exports = Helpers;
export default Helpers;
