/**
 * Утилита для проверки и использования ключей активации через Supabase RPC `validate_code`.
 * Коды одноразовые - после успешной проверки помечаются как used: true на стороне БД.
 */

import { getSupabase } from '@/lib/supabase';

type ValidateCodeStatus = 'valid' | 'used' | 'not_found';

async function validateViaSupabase(code: string): Promise<
    | { ok: true; status: ValidateCodeStatus }
    | { ok: false; errorMessage?: string }
> {
    const supabase = getSupabase();
    if (!supabase) {
        return { ok: false, errorMessage: 'Supabase is not configured' };
    }

    try {
        const { data, error } = await supabase.rpc('validate_code', { p_code: code });
        if (error) {
            return { ok: false, errorMessage: error.message || 'Supabase RPC error' };
        }
        const status = (data as any)?.status as ValidateCodeStatus | undefined;
        if (status !== 'valid' && status !== 'used' && status !== 'not_found') {
            return { ok: false, errorMessage: 'Unexpected response from validate_code' };
        }
        return { ok: true, status };
    } catch (e: any) {
        return { ok: false, errorMessage: e?.message ?? String(e) };
    }
}

/**
 * Проверить и использовать ключ активации
 * @param code - Код активации для проверки
 * @returns true если ключ валиден и был успешно использован, false если ключ невалиден или уже использован
 */
export async function validateAndUseActivationKey(code: string): Promise<{
    valid: boolean;
    message?: string;
}> {
    try {
        if (!code || code.length !== 6) {
            return {
                valid: false,
                message: 'Код должен состоять из 6 символов',
            };
        }

        const normalizedCode = code.toUpperCase();
        const supabaseResult = await validateViaSupabase(normalizedCode);
        if (supabaseResult.ok) {
            if (supabaseResult.status === 'valid') return { valid: true };
            if (supabaseResult.status === 'used') return { valid: false, message: 'Этот код активации уже был использован' };
            return { valid: false, message: 'Код активации не найден' };
        }
        return {
            valid: false,
            message: 'Не удалось проверить код (нет подключения или сервис недоступен)',
        };
    } catch (error) {
        console.error('[ActivationKeyValidator] Error validating key:', error);
        return {
            valid: false,
            message: 'Ошибка при проверке кода активации',
        };
    }
}
