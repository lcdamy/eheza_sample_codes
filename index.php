<?php


    $filename = './trans.csv';
    $h = fopen( $filename, 'r' );
    if ( $h ) 
 {
    $i =0;
        while ( ( $data = fgetcsv( $h ) ) !== FALSE ) 
  {

            $curl = curl_init();

            curl_setopt_array($curl, array(
                CURLOPT_URL => "https://google-translate1.p.rapidapi.com/language/translate/v2",
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_ENCODING => "",
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => "POST",
                CURLOPT_POSTFIELDS => "source=fr&q=".urlencode($data[1])."&target=en&source=fr",
                CURLOPT_HTTPHEADER => array(
                    "content-type: application/x-www-form-urlencoded",
                    "x-rapidapi-host: google-translate1.p.rapidapi.com",
                    "x-rapidapi-key: a38b78a30cmsh19d3e79b51a58b2p136791jsnaf20a83789d3"
                ),
            ));

            $response = curl_exec($curl);
            $err = curl_error($curl);

            curl_close($curl);
            $i++;
            if ($err) {
                echo "cURL Error #:" . $err;
            } else {
                  echo "Transilation okay ".$i."\n";
                 $file = fopen( 'translated2.csv', 'a' );
                 fputcsv($file, array($data[0],json_decode($response, true)['data']['translations'][0]['translatedText']));
             fclose( $file );

            }
   
        }
   
   }
