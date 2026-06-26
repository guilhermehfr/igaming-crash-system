import { Wallet } from './wallet.entity';

export interface IWalletRepository {
  findById(id: string): Promise<Wallet | null>;

  findByUserId(userId: string): Promise<Wallet | null>;

  findByUserIdAndDemoSessionId(userId: string, demoSessionId: string): Promise<Wallet | null>;

  save(wallet: Wallet): Promise<Wallet>;

  delete(id: string): Promise<boolean>;

  exists(id: string): Promise<boolean>;
}
