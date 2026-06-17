import type { Metadata } from "next";
import { LegalLayout } from "../legal/LegalLayout";

export const metadata: Metadata = { title: "사업자정보 — WorkBridge" };

// 전자상거래법 제10조(사업자 정보 등의 표시) 필수 표기 사항
const rows: [string, string][] = [
  ["상호", "[회사명]"],
  ["대표자", "[대표자명]"],
  ["사업자등록번호", "[000-00-00000]"],
  ["통신판매업 신고번호", "[제0000-지역-0000호]"],
  ["사업장 주소", "[도로명 주소]"],
  ["전화번호", "[연락처]"],
  ["이메일", "[support@example.com]"],
  ["개인정보 보호책임자", "[담당자명] ([이메일])"],
  ["호스팅 제공자", "Vercel Inc."],
];

export default function BusinessPage() {
  return (
    <LegalLayout title="사업자정보" updated="2026-06-17 (초안)">
      <p className="text-gray-600">
        「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 사업자 정보를 표시합니다.
        아래 대괄호 항목은 사업자등록·통신판매업 신고 완료 후 실제 값으로 채워야 합니다.
      </p>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {rows.map(([k, v]) => (
              <tr key={k}>
                <th className="w-40 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600">
                  {k}
                </th>
                <td className="px-4 py-3 text-gray-800">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        ※ 통신판매업 신고는 관할 시·군·구청 또는 정부24에서, 사업자등록은 홈택스에서
        진행합니다. 결제대금예치(에스크로)·구매안전서비스 가입 증빙이 신고 시 요구될 수
        있습니다.
      </p>
    </LegalLayout>
  );
}
