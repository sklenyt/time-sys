export enum Pohlavi {
  M = "M",
  Z = "Z",
}

export enum TypStartu {
  HROMADNY = "HROMADNY",
  VLNOVY = "VLNOVY",
  INTERVALOVY = "INTERVALOVY",
}

export enum TypUdalosti {
  START = "START",
  DOJEZD = "DOJEZD",
  MEZICAS = "MEZICAS",
  OPRAVA = "OPRAVA",
  DNS = "DNS",
  DNF = "DNF",
  DQ = "DQ",
}

/** Důvod opravy záznamu — řízený výčet, ne volný text. */
export enum TypOpravy {
  ORIGINAL = "ORIGINAL",
  PREPIS_POSLEDNIHO_RADKU = "PREPIS_POSLEDNIHO_RADKU",
  PREPIS_NULY_NA_CISLO = "PREPIS_NULY_NA_CISLO",
  PREPSANE_CISLO = "PREPSANE_CISLO",
  ZMENA_V_UPRAVACH = "ZMENA_V_UPRAVACH",
}

export enum StavZaznamu {
  OK = "OK",
  NEEDS_REVIEW = "NEEDS_REVIEW",
}

export enum StavUkonceni {
  DNS = "DNS",
  DNF = "DNF",
  DQ = "DQ",
}

export enum Role {
  ADMIN = "ADMIN",
  ORGANIZATOR = "ORGANIZATOR",
  CASOMERIC = "CASOMERIC",
  STANOVISTE = "STANOVISTE",
  VEREJNOST = "VEREJNOST",
}

export enum TypZarizeni {
  CIL = "CIL",
  STANOVISTE = "STANOVISTE",
}

export enum StavCipu {
  PRIREZEN = "PRIREZEN",
  VRACEN = "VRACEN",
  ZTRACEN = "ZTRACEN",
  ZALOZNI = "ZALOZNI",
}

export enum ProtokolPublikace {
  FTP = "FTP",
  FTPS = "FTPS",
  SFTP = "SFTP",
}

export enum StavExportu {
  OK = "OK",
  CHYBA = "CHYBA",
}
