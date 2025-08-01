import fetch from "node-fetch";

export interface PincodeInfo {
  isValid: boolean;
  postOffice?: string;
  district?: string;
  state?: string;
  city?: string;
  error?: string;
}

export class PincodeValidator {
  private static readonly API_BASE_URL = "https://api.postalpincode.in/pincode";

  static async validatePincode(pincode: string): Promise<PincodeInfo> {
    try {
      // Basic validation first
      if (!/^\d{6}$/.test(pincode)) {
        return {
          isValid: false,
          error: "Pincode must be exactly 6 digits",
        };
      }

      // Call the India Post API
      const response = await fetch(`${this.API_BASE_URL}/${pincode}`);

      if (!response.ok) {
        return {
          isValid: false,
          error: `API Error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        return {
          isValid: false,
          error: "Invalid pincode format",
        };
      }

      const result = data[0];

      if (result.Status === "Error" || result.Status === "404") {
        return {
          isValid: false,
          error: result.Message || "Invalid pincode",
        };
      }

      if (
        result.Status === "Success" &&
        result.PostOffice &&
        result.PostOffice.length > 0
      ) {
        const postOffice = result.PostOffice[0];
        return {
          isValid: true,
          postOffice: postOffice.Name,
          district: postOffice.District,
          state: postOffice.State,
          city: postOffice.Block || postOffice.Division,
        };
      }

      return {
        isValid: false,
        error: "Pincode not found",
      };
    } catch (error) {
      console.error("❌ Error validating pincode:", error);
      return {
        isValid: false,
        error: "Network error while validating pincode",
      };
    }
  }

  static formatPincodeInfo(info: PincodeInfo): string {
    if (!info.isValid) {
      return `❌ <b>Invalid Pincode</b>\n\n${info.error}\n\n💡 <b>Try Again:</b>\nUse /pincode to view your current pincode or send a valid 6-digit pincode.`;
    }

    return `✅ <b>Valid Pincode</b>\n\n📍 <b>Location Details:</b>\n• Post Office: ${
      info.postOffice
    }\n• District: ${info.district}\n• State: ${info.state}\n• City: ${
      info.city || "N/A"
    }`;
  }
}
