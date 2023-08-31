using System.IO.Compression;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json.Nodes;
using DocumentFormat.OpenXml.Wordprocessing;
using OfficeIMO.Word;
using Color = SixLabors.ImageSharp.Color;

namespace ApiConverter.Services;

public class DocumentGenerator : IDocumentGenerator
{
    private readonly string[] _apiDocumentNotes;
    private readonly Dictionary<string, string> _apiDefaultInputRemark;
    private readonly Dictionary<string, string> _apiDefaultOutputRemark;
    private readonly Dictionary<string, string> _apiDefaultInputMock;
    private readonly Dictionary<string, string> _apiDefaultOutputMock;
    private readonly string[] _upDocumentNotes;
    private readonly Dictionary<string, string> _upDefaultInputRemark;
    private readonly Dictionary<string, string> _upDefaultOutputRemark;
    private readonly Dictionary<string, string> _upDefaultInputMock;
    private readonly Dictionary<string, string> _upDefaultOutputMock;

    public DocumentGenerator(IApiDocumentNote apiDocumentNote, IApiDefaultInputRemark apiDefaultInputRemark, IApiDefaultOutputRemark apiDefaultOutputRemark, IApiDefaultInputMock apiDefaultInputMock, IApiDefaultInputMock apiDefaultOutputMock,
        IUpDocumentNote upDocumentNote, IUpDefaultInputRemark upDefaultInputRemark, IUpDefaultOutputRemark upDefaultOutputRemark, IUpDefaultInputMock upDefaultInputMock, IUpDefaultOutputMock upDefaultOutputMock)
    {
        _apiDocumentNotes = apiDocumentNote.Get();
        _apiDefaultInputRemark = apiDefaultInputRemark.Get();
        _apiDefaultOutputRemark = apiDefaultOutputRemark.Get();
        _apiDefaultInputMock = apiDefaultInputMock.Get();
        _apiDefaultOutputMock = apiDefaultOutputMock.Get();
        _upDocumentNotes = upDocumentNote.Get();
        _upDefaultInputRemark = upDefaultInputRemark.Get();
        _upDefaultOutputRemark = upDefaultOutputRemark.Get();
        _upDefaultInputMock = upDefaultInputMock.Get();
        _upDefaultOutputMock = upDefaultOutputMock.Get();
    }

    public byte[] Generate(string json)
    {
        JsonNode? root = JsonNode.Parse(json);
        if (root == null)
        {
            throw new ApplicationException("請輸入符合規範的JSON");
        }

        JsonNode? data = root["data"];
        return data != null ? GenerateApiGroup(data.AsArray()) : GenerateApi(root.AsObject());
    }

    private byte[] GenerateApi(JsonObject root)
    {
        // 根據 API 的 json 內容, 產出 word 檔案
        string filePath = Path.GetTempPath() + Guid.NewGuid() + ".docx";

        using (var document = WordDocument.Create(filePath))
        {
            document.Sections[0].SetMargins(WordMargin.Narrow);
            SetDocumentProperties(document, root);
            RenderApiNameParagraph(document, root);
            RenderApiMethodAndUrlParagraph(document, root);
            RenderApiRemark(document, root);
            RenderApiParam(document, root);
            RenderDocumentNote(document, root);
            document.Save();
        }

        byte[] result = File.ReadAllBytes(filePath);
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }

        return result;
    }

    private byte[] GenerateApiGroup(JsonArray rootArray)
    {
        // 根據每個 API 的 json 內容, 分別產出 word 檔案後, 合併到 zip 檔中
        Dictionary<string, byte[]> map = new();
        for (var i = 0; i < rootArray.Count; i++)
        {
            JsonNode? root = rootArray[i];
            if (root == null)
            {
                continue;
            }

            string strDate = root["updatedAt"]!.GetValue<string>().Substring(0, 10);
            DateTime date = DateTime.Parse(strDate);

            string fileName = string.Join("_", root["name"]!.GetValue<string>().Split(Path.GetInvalidFileNameChars())) + "-" + date.ToString("yyyyMMdd") + ".docx";
            byte[] data = GenerateApi(root.AsObject());

            map.Add(fileName, data);
        }

        using var archiveStream = new MemoryStream();
        using (var archive = new ZipArchive(archiveStream, ZipArchiveMode.Create, true))
        {
            foreach (KeyValuePair<string, byte[]> item in map)
            {
                string fileName = item.Key;
                byte[] data = item.Value;
                ZipArchiveEntry entry = archive.CreateEntry(fileName, CompressionLevel.Fastest);
                using Stream zipStream = entry.Open();
                zipStream.Write(data, 0, data.Length);
            }
        }

        return archiveStream.ToArray();
    }

    private void SetDocumentProperties(WordDocument document, JsonNode root)
    {
        var name = root["name"]!.GetValue<string>();
        DateTime createdAt = DateTime.Parse(root["createdAt"]!.GetValue<string>());
        DateTime updatedAt = DateTime.Parse(root["updatedAt"]!.GetValue<string>());

        document.BuiltinDocumentProperties.Creator = "ApiConverter";
        document.BuiltinDocumentProperties.LastModifiedBy = "ApiConverter";
        document.BuiltinDocumentProperties.Title = name;
        document.BuiltinDocumentProperties.Subject = "API";
        document.BuiltinDocumentProperties.Keywords = "API";
        document.BuiltinDocumentProperties.Created = createdAt;
        document.BuiltinDocumentProperties.Modified = updatedAt;
        document.ApplicationProperties.Company = "元大證券";
    }

    private void RenderApiNameParagraph(WordDocument document, JsonNode root)
    {
        var name = root["name"]!.GetValue<string>();

        WordParagraph? p = document.Sections[0].AddParagraph()
            .SetText(name)
            .SetStyle(WordParagraphStyles.Heading1)
            .SetFontFamily("Calibri")
            .SetFontSize(16)
            .SetBold()
            .SetColor(Color.FromRgb(79, 129, 189));

        p.LineSpacingBefore = 240;
        p.LineSpacingAfter = 240;
    }

    private void RenderApiMethodAndUrlParagraph(WordDocument document, JsonNode root)
    {
        var method = root["method"]!.GetValue<string>();
        var url = root["url"]!.GetValue<string>();

        WordParagraph? p = document.Sections[0].AddParagraph()
            .SetText($"{method}: {url}")
            .SetFontFamily("Cambria")
            .SetStyle(WordParagraphStyles.Normal)
            .SetFontSize(12)
            .SetBold();

        p.LineSpacingBefore = 200;
        p.LineSpacingAfter = 200;
    }

    private void RenderApiRemark(WordDocument document, JsonNode root)
    {
        string[] lines = root["remark"]?.GetValue<string>().Split("\n") ?? Array.Empty<string>();

        WordParagraph? p = document.Sections[0].AddParagraph();

        foreach (string line in lines)
        {
            p.AddText(line)
                .SetStyle(WordParagraphStyles.Normal)
                .SetFontFamily("Calibri")
                .SetFontSize(8)
                .AddBreak(BreakValues.TextWrapping);

            p.LineSpacingBefore = null;
            p.LineSpacingAfter = null;
        }
    }

    private void RenderApiParam(WordDocument document, JsonNode root)
    {
        JsonArray paramArray = root["param"]!.AsArray();

        foreach (JsonNode? param in paramArray)
        {
            if (param == null)
            {
                continue;
            }

            RenderName(param);

            RenderRemark(param);

            if (IsApiMode(root))
            {
                if (param["bodyInfo"]?["rawJSON"] != null)
                {
                    RenderRemarkJson("Input", param["bodyInfo"]!["rawJSON"]!, InputOutput.Input);
                }

                if (param["outParam"] != null)
                {
                    RenderRemarkJson("Output", param["outParam"]!, InputOutput.Output);
                }
            }
            else
            {
                document.Sections[0].AddParagraph()
                    .SetText($"Input: {Environment.NewLine}")
                    .SetStyle(WordParagraphStyles.Normal)
                    .SetFontFamily("Calibri")
                    .SetFontSize(8);

                if (param["bodyInfo"]?["rawJSON"] != null)
                {
                    RenderRemarkJson("傳輸範例", param["bodyInfo"]!["rawJSON"]!, InputOutput.Input, true);
                    RenderRemarkJson("傳輸範例 (同上, 以下解密 CipherText 僅供友善閱讀)", param["bodyInfo"]!["rawJSON"]!, InputOutput.Input);
                }

                document.Sections[0].AddParagraph()
                    .SetText($"Output: {Environment.NewLine}")
                    .SetStyle(WordParagraphStyles.Normal)
                    .SetFontFamily("Calibri")
                    .SetFontSize(8);

                if (param["outParam"] != null)
                {
                    RenderRemarkJson("傳輸範例", param["outParam"]!, InputOutput.Output, true);
                    RenderRemarkJson("傳輸範例 (同上, 以下解密 Data 僅供友善閱讀)", param["outParam"]!, InputOutput.Output);
                }
            }

            RenderBodyInfo(param);

            RenderOutputInfoAndParam(param);
        }

        document.Sections[0].AddParagraph();

        void RenderName(JsonNode jsonNode)
        {
            document.Sections[0].AddParagraph()
                .SetText(jsonNode["name"]!.GetValue<string>())
                .SetStyle(WordParagraphStyles.Heading2)
                .SetFontFamily("Calibri")
                .SetFontSize(12)
                .SetBold()
                .SetColor(Color.FromRgb(79, 129, 189));
        }

        void RenderRemark(JsonNode jsonNode)
        {
            var remark = jsonNode["remark"]!.GetValue<string>();
            if (!string.IsNullOrEmpty(remark))
            {
                string[] lines = remark.Split("\n");

                foreach (string line in lines)
                {
                    WordParagraph? p = document.Sections[0].AddParagraph()
                        .SetText(line)
                        .SetStyle(WordParagraphStyles.Normal)
                        .SetFontFamily("Calibri")
                        .SetFontSize(8);

                    p.LineSpacingAfter = 0;
                }
            }
        }

        void RenderRemarkJson(string description, JsonNode jsonNode, InputOutput inputOutput, bool replace = false)
        {
            JsonArray nodeArray = jsonNode.AsArray();

            using var stream = new MemoryStream();

            using var writer = new Utf8JsonWriter(stream, new JsonWriterOptions
            {
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
            });
            writer.WriteStartObject();

            foreach (JsonNode? node in nodeArray)
            {
                if (node == null)
                {
                    continue;
                }
                
                var name = node["name"]!.GetValue<string>();
                JsonArray? dataArray = node["data"]?.AsArray();
                var mock = node["mock"]!.GetValue<string>();
                var type = (ParamType)node["type"]!.GetValue<int>();

                if (IsUpMode(root) && replace)
                {
                    if (inputOutput == InputOutput.Input)
                    {
                        if (string.Equals(name, "CipherText", StringComparison.InvariantCultureIgnoreCase))
                        {
                            type = ParamType.String;
                            mock = _upDefaultInputMock["CipherText"];
                        }
                    }
                    else
                    {
                        if (string.Equals(name, "Data", StringComparison.InvariantCultureIgnoreCase))
                        {
                            type = ParamType.String;
                            mock = _upDefaultOutputMock["Data"];
                        }
                    }
                }

                switch (type)
                {
                    case ParamType.String:
                        {
                            writer.WriteString(name, mock);
                            break;
                        }
                    case ParamType.Number:
                        {
                            if (decimal.TryParse(mock, out decimal numberValue))
                            {
                                writer.WriteNumber(name, numberValue);
                            }
                            else
                            {
                                writer.WriteNumber(name, 0);
                            }

                            break;
                        }
                    case ParamType.Boolean:
                        {
                            writer.WriteBoolean(name, bool.TryParse(mock, out bool boolValue) && boolValue);

                            break;
                        }
                    case ParamType.Object:
                        if (dataArray != null)
                        {
                            writer.WritePropertyName(name);

                            writer.WriteStartObject();
                            foreach (JsonNode? data in dataArray)
                            {
                                if (data == null)
                                {
                                    continue;
                                }

                                RenderRemarkJsonData(description, writer, data);
                            }

                            writer.WriteEndObject();
                        }
                        else
                        {
                            throw new ApplicationException($"{description} 中 Object 應有子節點");
                        }

                        break;
                    case ParamType.Array:
                        if (dataArray != null)
                        {
                            writer.WritePropertyName(name);

                            writer.WriteStartArray();
                            foreach (JsonNode? data in dataArray)
                            {
                                if (data == null)
                                {
                                    continue;
                                }

                                RenderRemarkJsonData(description, writer, data);
                            }

                            writer.WriteEndArray();
                        }
                        else
                        {
                            throw new ApplicationException($"{description} 中 Array 應有子節點");
                        }

                        break;
                }
            }

            writer.WriteEndObject();
            writer.Flush();

            string json = Encoding.UTF8.GetString(stream.ToArray());
            WordParagraph? p = document.Sections[0].AddParagraph()
                .SetText($"{description}: {Environment.NewLine}")
                .SetStyle(WordParagraphStyles.Normal)
                .SetFontFamily("Calibri")
                .SetFontSize(8);
           
            p.AddText(json)
                .SetStyle(WordParagraphStyles.Normal)
                .SetFontFamily("Calibri")
                .SetFontSize(8);
        }

        void RenderRemarkJsonData(string description, Utf8JsonWriter writer, JsonNode data)
        {
            var mock = data["mock"]!.GetValue<string>();
            var type = (ParamType)data["type"]!.GetValue<int>();
            JsonArray? d = data["data"]?.AsArray();
            switch (type)
            {
                case ParamType.String:
                    {
                        var name = data["name"]!.GetValue<string>();
                        writer.WriteString(name, mock);

                        break;
                    }
                case ParamType.Number:
                    {
                        var name = data["name"]!.GetValue<string>();
                        if (decimal.TryParse(mock, out decimal numberValue))
                        {
                            writer.WriteNumber(name, numberValue);
                        }
                        else
                        {
                            writer.WriteNumber(name, 0);
                        }

                        break;
                    }
                case ParamType.Boolean:
                    {
                        var name = data["name"]!.GetValue<string>();
                        writer.WriteBoolean(name, bool.TryParse(mock, out bool boolValue) && boolValue);
                        break;
                    }
                case ParamType.Object:
                    {
                        if (d != null)
                        {
                            var name = data["name"]?.GetValue<string>();
                            if (name != null)
                            {
                                writer.WritePropertyName(name);
                            }

                            writer.WriteStartObject();
                            foreach (JsonNode? item in d.AsArray())
                            {
                                if (item == null)
                                {
                                    continue;
                                }

                                RenderRemarkJsonData(description, writer, item);
                            }

                            writer.WriteEndObject();
                        }
                        else
                        {
                            throw new ApplicationException($"{description} 中 Object 應有子節點");
                        }

                        break;
                    }
                case ParamType.Array:
                    {
                        if (d != null)
                        {
                            var name = data["name"]?.GetValue<string>();
                            if (name != null)
                            {
                                writer.WritePropertyName(name);
                            }

                            writer.WriteStartArray();
                            foreach (JsonNode? item in d.AsArray())
                            {
                                if (item == null)
                                {
                                    continue;
                                }

                                RenderRemarkJsonData(description, writer, item);
                            }

                            writer.WriteEndArray();
                        }
                        else
                        {
                            throw new ApplicationException($"{description} 中 Array 應有子節點");
                        }

                        break;
                    }
            }
        }

        void RenderBodyInfo(JsonNode jsonNode)
        {
            if (jsonNode["bodyInfo"] == null)
            {
                throw new ApplicationException("未定義 bodyInfo");
            }

            var type = jsonNode["bodyInfo"]!["type"]!.GetValue<int>();
            if (type != 1)
            {
                throw new ApplicationException("轉檔目前只支援 bodyInfo > type = [1] (Raw)");
            }

            var rawType = jsonNode["bodyInfo"]!["rawType"]!.GetValue<int>();
            if (rawType != 2)
            {
                throw new ApplicationException("轉檔目前只支援 bodyInfo > rawType = [2] (JSON)");
            }

            var rawJsonType = jsonNode["bodyInfo"]!["rawJSONType"]!.GetValue<int>();
            if (rawJsonType != 0)
            {
                throw new ApplicationException("轉檔目前只支援 bodyInfo > rawJSONType = [0] (Array)");
            }

            WordParagraph? p = document.Sections[0].AddParagraph()
                .SetText("Input")
                .SetStyle(WordParagraphStyles.Heading3)
                .SetFontFamily("Calibri")
                .SetItalic()
                .SetColor(Color.FromRgb(79, 129, 189));

            p.LineSpacingBefore = 180;
            p.LineSpacingAfter = 180;

            RenderParam(jsonNode["bodyInfo"]!["rawJSON"]?.AsArray(), InputOutput.Input);
            document.AddHorizontalLine(BorderValues.None);
        }

        void RenderOutputInfoAndParam(JsonNode jsonNode)
        {
            if (jsonNode["outParam"] == null)
            {
                throw new ApplicationException("未定義 outParam");
            }

            if (jsonNode["outInfo"] == null)
            {
                throw new ApplicationException("未定義 outInfo");
            }

            if (jsonNode["outInfo"]!["type"]!.GetValue<int>() != 0)
            {
                throw new ApplicationException("轉檔目前只支援 outInfo > type = [0] (JSON)");
            }

            if (jsonNode["outInfo"]!["jsonType"]!.GetValue<int>() != 0)
            {
                throw new ApplicationException("轉檔目前只支援 outInfo > jsonType = [0] (Object)");
            }

            WordParagraph? p = document.Sections[0].AddParagraph()
                .SetText("Output")
                .SetStyle(WordParagraphStyles.Heading3)
                .SetFontFamily("Calibri")
                .SetItalic()
                .SetColor(Color.FromRgb(79, 129, 189));

            p.LineSpacingBefore = 180;
            p.LineSpacingAfter = 180;

            RenderParam(jsonNode["outParam"]?.AsArray(), InputOutput.Output);
            document.AddHorizontalLine(BorderValues.None);
        }

        void RenderParam(JsonArray? jsonArray, InputOutput inputOutput)
        {
            if (jsonArray == null || jsonArray.Count == 0)
            {
                return;
            }

            WordTable table = document.AddTable(jsonArray.Count + 1, 5);
            table.LayoutType = TableLayoutValues.Fixed;
            table.ColumnWidth = new List<int> { 2500, 1000, 750, 3200, 3250 };
            table.Alignment = TableRowAlignmentValues.Center;
            table.Rows[0].Cells[0].Paragraphs[0].SetFontSize(9).Text = "欄位名稱";
            table.Rows[0].Cells[1].Paragraphs[0].Text = "型別";
            table.Rows[0].Cells[2].Paragraphs[0].Text = "必要";
            table.Rows[0].Cells[3].Paragraphs[0].Text = "說明";
            table.Rows[0].Cells[4].Paragraphs[0].Text = "範例";
            table.Rows[0].Cells[0].ShadingFillColor = Color.FromRgb(191, 191, 191);
            table.Rows[0].Cells[1].ShadingFillColor = Color.FromRgb(191, 191, 191);
            table.Rows[0].Cells[2].ShadingFillColor = Color.FromRgb(191, 191, 191);
            table.Rows[0].Cells[3].ShadingFillColor = Color.FromRgb(191, 191, 191);
            table.Rows[0].Cells[4].ShadingFillColor = Color.FromRgb(191, 191, 191);

            for (var i = 0; i < jsonArray.Count; i++)
            {
                JsonNode item = jsonArray[i]!;
                var name = item["name"]!.GetValue<string>();
                table.Rows[i + 1].Cells[0].Paragraphs[0].Text = name;
                var type = (ParamType)item["type"]!.GetValue<int>();
                if (type == ParamType.Mixed)
                {
                    type = ParamType.String;
                }

                if (IsUpMode(root) && name is "Data" or "CipherText")
                {
                    type = ParamType.String;
                }

                table.Rows[i + 1].Cells[1].Paragraphs[0].Text = type.ToString();

                var must = item["must"]!.GetValue<int>();
                table.Rows[i + 1].Cells[2].Paragraphs[0].Text = (ParamMust)must == ParamMust.Yes ? "V" : string.Empty;

                // 若說明為空的時候，幫忙補上預設的說明
                var remark = item["remark"]?.GetValue<string>();
                if (string.IsNullOrEmpty(remark))
                {
                    if (IsApiMode(root))
                    {
                        if (_apiDefaultInputRemark.TryGetValue(name, out string? value))
                        {
                            table.Rows[i + 1].Cells[3].Paragraphs[0].Text = value;
                        }
                        else if (_apiDefaultOutputRemark.TryGetValue(name, out string? value1))
                        {
                            table.Rows[i + 1].Cells[3].Paragraphs[0].Text = value1;
                        }
                    }
                    else
                    {
                        if (_upDefaultInputRemark.TryGetValue(name, out string? value))
                        {
                            table.Rows[i + 1].Cells[3].Paragraphs[0].Text = value;
                        }
                        else if (_upDefaultOutputRemark.TryGetValue(name, out string? value1))
                        {
                            table.Rows[i + 1].Cells[3].Paragraphs[0].Text = value1;
                        }
                    }
                }
                else
                {
                    string[] lines = remark.Split("\n");
                    for (var j = 0; j < lines.Length; j++)
                    {
                        string line = lines[j];
                        if (j == 0)
                        {
                            table.Rows[i + 1].Cells[3].Paragraphs[0].SetText(line);
                        }
                        else
                        {
                            table.Rows[i + 1].Cells[3].Paragraphs[0].AddText(line);
                        }

                        if (j != lines.Length - 1)
                        {
                            table.Rows[i + 1].Cells[3].Paragraphs[0].AddBreak();
                        }
                    }
                }

                // 如果符合預設欄位, 不管範例填寫什麼，都會換成預設的文字
                var mock = item["mock"]?.GetValue<string>();
                if (inputOutput == InputOutput.Input)
                {
                    table.Rows[i + 1].Cells[4].Paragraphs[0].Text = mock;
                    if (IsApiMode(root))
                    {
                        if (_apiDefaultInputMock.TryGetValue(name, out string? value))
                        {
                            table.Rows[i + 1].Cells[4].Paragraphs[0].Text = value;
                        }
                    }
                    else
                    {
                        if (_upDefaultInputMock.TryGetValue(name, out string? value))
                        {
                            table.Rows[i + 1].Cells[4].Paragraphs[0].Text = value;
                        }
                    }
                }
                else
                {
                    table.Rows[i + 1].Cells[4].Paragraphs[0].Text = mock;
                    if (IsApiMode(root))
                    {
                        if (_apiDefaultOutputMock.TryGetValue(name, out string? value))
                        {
                            table.Rows[i + 1].Cells[4].Paragraphs[0].Text = value;
                        }
                    }
                    else
                    {
                        if (_upDefaultOutputMock.TryGetValue(name, out string? value))
                        {
                            table.Rows[i + 1].Cells[4].Paragraphs[0].Text = value;
                        }
                    }
                }
            }

            for (var i = 0; i < jsonArray.Count; i++)
            {
                JsonNode item = jsonArray[i]!;
                var type = (ParamType)item["type"]!.GetValue<int>();
                var name = item["name"]!.GetValue<string>();
                // 如果目前節點是Array型別, 且子類別為Object
                if (type == ParamType.Array)
                {
                    JsonArray? data = item["data"]?.AsArray();
                    if (data == null)
                    {
                        continue;
                    }

                    for (var j = 0; j < data.Count; j++)
                    {
                        JsonNode? child = data[j];
                        if (child == null)
                        {
                            continue;
                        }

                        var childType = (ParamType)child["type"]!.GetValue<int>();
                        if (childType == ParamType.Object)
                        {
                            RenderParamData(child["data"]?.AsArray(), name);
                        }
                    }
                }
                else if (type == ParamType.Object)
                {
                    RenderParamData(item["data"]?.AsArray(), name);
                }
            }
        }

        void RenderParamData(JsonArray? jsonArray, string dataName)
        {
            if (jsonArray == null || jsonArray.Count == 0)
            {
                return;
            }

            Color headBgColor = Color.FromRgb(191, 191, 191);
            Color contentBgColor = Color.FromRgb(255, 255, 255);
            if (IsUpMode(root))
            {
                if (dataName == "CipherText")
                {
                    headBgColor = Color.FromRgb(244, 176, 131);
                    contentBgColor = Color.FromRgb(251, 228, 213);
                }
                else if (dataName == "Data")
                {
                    headBgColor = Color.FromRgb(142, 170, 219);
                    contentBgColor = Color.FromRgb(217, 226, 243);
                }
            }

            WordTable table = document.AddTable(jsonArray.Count + 1, 5);
            table.LayoutType = TableLayoutValues.Fixed;
            table.ColumnWidth = new List<int> { 2500, 1000, 750, 3200, 3250 };
            table.Alignment = TableRowAlignmentValues.Center;
            table.Rows[0].Cells[0].Paragraphs[0].SetFontSize(10).Text = dataName + "欄位名稱";
            table.Rows[0].Cells[1].Paragraphs[0].Text = "型別";
            table.Rows[0].Cells[2].Paragraphs[0].Text = "必要";
            table.Rows[0].Cells[3].Paragraphs[0].Text = "說明";
            table.Rows[0].Cells[4].Paragraphs[0].Text = "範例";
            table.Rows[0].Cells[0].ShadingFillColor = headBgColor;
            table.Rows[0].Cells[1].ShadingFillColor = headBgColor;
            table.Rows[0].Cells[2].ShadingFillColor = headBgColor;
            table.Rows[0].Cells[3].ShadingFillColor = headBgColor;
            table.Rows[0].Cells[4].ShadingFillColor = headBgColor;

            for (var i = 0; i < jsonArray.Count; i++)
            {
                JsonNode? item = jsonArray[i];
                if (item == null)
                {
                    continue;
                }

                if (IsUpMode(root) && (dataName == "CipherText" || dataName == "Data"))
                {
                    for (var j = 0; j <= 4; j++)
                    {
                        table.Rows[i + 1].Cells[j].ShadingFillColor = contentBgColor;
                    }
                }

                var name = item["name"]!.GetValue<string>();
                table.Rows[i + 1].Cells[0].Paragraphs[0].Text = name;

                var type = (ParamType)item["type"]!.GetValue<int>();
                if (type == ParamType.Mixed)
                {
                    type = ParamType.String;
                }

                table.Rows[i + 1].Cells[1].Paragraphs[0].Text = type.ToString();

                var must = (ParamMust)item["must"]!.GetValue<int>();
                table.Rows[i + 1].Cells[2].Paragraphs[0].Text = must == ParamMust.Yes ? "V" : string.Empty;

                var remark = item["remark"]?.GetValue<string>();
                string[] lines = remark?.Split("\n") ?? Array.Empty<string>();
                for (var j = 0; j < lines.Length; j++)
                {
                    string line = lines[j];
                    if (j == 0)
                    {
                        table.Rows[i + 1].Cells[3].Paragraphs[0].SetText(line);
                    }
                    else
                    {
                        table.Rows[i + 1].Cells[3].Paragraphs[0].AddText(line);
                    }

                    if (j != lines.Length - 1)
                    {
                        table.Rows[i + 1].Cells[3].Paragraphs[0].AddBreak();
                    }
                }

                var mock = item["mock"]?.GetValue<string>();
                table.Rows[i + 1].Cells[4].Paragraphs[0].Text = mock;
            }

            for (var i = 0; i < jsonArray.Count; i++)
            {
                JsonNode? item = jsonArray[i];
                if (item == null)
                {
                    continue;
                }

                var name = item["name"]!.GetValue<string>();
                var type = (ParamType)item["type"]!.GetValue<int>();
                // 如果目前節點是Array型別, 且子類別為Object
                if (type == ParamType.Array)
                {
                    JsonArray? data = item["data"]?.AsArray();
                    if (data == null)
                    {
                        continue;
                    }

                    for (var j = 0; j < data.Count; j++)
                    {
                        JsonNode? child = data[j];
                        if (child == null)
                        {
                            continue;
                        }

                        var childType = (ParamType)child["type"]!.GetValue<int>();
                        if (childType == ParamType.Object)
                        {
                            RenderParamData(child["data"]?.AsArray(), name);
                        }
                    }
                }
                else if (type == ParamType.Object)
                {
                    RenderParamData(item["data"]?.AsArray(), name);
                }
            }
        }
    }

    private void RenderDocumentNote(WordDocument document, JsonNode root)
    {
        document.Sections[0].Paragraphs.Last().AddText("文件備註");
        WordList? list = document.AddList(WordListStyle.Bulleted);

        string[] notes = IsApiMode(root) ? _apiDocumentNotes : _upDocumentNotes;
        foreach (string line in notes)
        {
            list.AddItem(line);
        }
    }

    private bool IsApiMode(JsonNode root) => root["url"]!.GetValue<string>().ToLower().StartsWith("api/");

    private bool IsUpMode(JsonNode root) => root["url"]!.GetValue<string>().ToLower().StartsWith("up/");
}