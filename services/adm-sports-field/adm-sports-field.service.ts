import core from "../../client";

const admSportsFieldProvider = {
  async getList(params?: any): Promise<any> {
    try {
      const result = await core.fetch<any>("/adm-sports-field", params);
      return result;
    } catch (err) {
      return err;
    }
  },
  async create(data: any): Promise<any> {
    try {
      const result = await core.create<any>("/adm-sports-field", data);
      return result;
    } catch (err) {
      return err;
    }
  },
  async getById(uuid: string): Promise<any> {
    try {
      const result = await core.fetch<any>(`/adm-sports-field/${uuid}`);
      return result;
    } catch (err) {
      return err;
    }
  },
  async update(uuid: string, data: any): Promise<any> {
    try {
      const result = await core.update<any>(`/adm-sports-field/${uuid}`, data);
      return result;
    } catch (err) {
      return err;
    }
  },
  async delete(uuid: string): Promise<any> {
    try {
      const result = await core.remove<any>(`/adm-sports-field/${uuid}`);
      return result;
    } catch (err) {
      return err;
    }
  },
  async createPricing(data: any): Promise<any> {
    try {
      const result = await core.create<any>("/adm-sports-field/pricing", data);
      return result;
    } catch (err) {
      return err;
    }
  },
  async updatePricing(uuid: string, data: any): Promise<any> {
    try {
      const result = await core.update<any>(`/adm-sports-field/pricing/${uuid}`, data);
      return result;
    } catch (err) {
      return err;
    }
  },
  async deletePricing(uuid: string): Promise<any> {
    try {
      const result = await core.remove<any>(`/adm-sports-field/pricing/${uuid}`);
      return result;
    } catch (err) {
      return err;
    }
  },
  async createAmenity(data: any): Promise<any> {
    try {
      const result = await core.create<any>("/adm-sports-field/amenity", data);
      return result;
    } catch (err) {
      return err;
    }
  },
  async updateAmenity(uuid: string, data: any): Promise<any> {
    try {
      const result = await core.update<any>(`/adm-sports-field/amenity/${uuid}`, data);
      return result;
    } catch (err) {
      return err;
    }
  },
  async deleteAmenity(uuid: string): Promise<any> {
    try {
      const result = await core.remove<any>(`/adm-sports-field/amenity/${uuid}`);
      return result;
    } catch (err) {
      return err;
    }
  },
  async createService(data: any): Promise<any> {
    try {
      const result = await core.create<any>("/adm-sports-field/service", data);
      return result;
    } catch (err) {
      return err;
    }
  },
  async updateService(uuid: string, data: any): Promise<any> {
    try {
      const result = await core.update<any>(`/adm-sports-field/service/${uuid}`, data);
      return result;
    } catch (err) {
      return err;
    }
  },
  async deleteService(uuid: string): Promise<any> {
    try {
      const result = await core.remove<any>(`/adm-sports-field/service/${uuid}`);
      return result;
    } catch (err) {
      return err;
    }
  },
  async upload(data: FormData): Promise<any> {
    try {
      const result = await core.upload<any>("/adm-sports-field/upload", data);
      return result;
    } catch (err) {
      return err;
    }
  },
  async getMediaById(parentUuid: string): Promise<any> {
    try {
      const result = await core.fetch<any>(`/adm-sports-field/media/${parentUuid}`);
      return result;
    } catch (err) {
      return err;
    }
  },
  async deleteMedia(uuid: string): Promise<any> {
    try {
      const result = await core.remove<any>(`/adm-sports-field/media/${uuid}`);
      return result;
    } catch (err) {
      return err;
    }
  },
};

export default admSportsFieldProvider;
